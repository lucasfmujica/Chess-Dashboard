"""La voz: convertir evidencia ya calculada en prosa, y agrupar lo explicado.

`run_patterns` vive acá y no aparte porque comparte los modelos y repite la
misma danza de proveedor que `_narrator` (import del SDK, chequeo de la clave,
default de modelo). Están juntos para que esa duplicación se vea; unificarlos
cambiaría comportamiento —distinto max_tokens, salida estructurada, y el
refusal termina en sys.exit de un lado y en None del otro— así que no se toca.
"""

from __future__ import annotations

import json
import os
import sys

# Regla de oro: el modelo REDACTA hechos ya calculados, no analiza ajedrez. Si
# se le pide que explique una posición por su cuenta escribe algo que suena bien
# y suele estar mal. Todo lo que aparece en el prompt salió de un motor.

# El modelo y el esfuerzo son los dos manijazos de costo, y el output domina la
# cuenta (el pliego de hechos son ~350 tokens, la prosa con thinking ~1100).
# Sobre las ~153 divergencias de las 51 OTB: Opus 5 ~US$4.6, Sonnet 5 ~US$2.7,
# Haiku 4.5 ~US$0.9, y Opus con effort low ~US$1.3. Se paga una sola vez porque
# la explicación queda cacheada en la tabla.
EXPLAIN_MODEL = "claude-opus-5"
EXPLAIN_EFFORT = "medium"
# Grok sale más barato que Opus para esto (~US$1.15 contra ~US$4.57 sobre las
# ~153 divergencias de las 51 OTB), aunque Haiku 4.5 sale menos que los dos. El
# prompt es el mismo para ambos proveedores a propósito: son instrucciones de
# redacción, no dependen del modelo, y eso hace que la comparación sea justa.
XAI_MODEL = "grok-4.6"
XAI_BASE_URL = "https://api.x.ai/v1"

EXPLAIN_SYSTEM = """Sos un entrenador de ajedrez escribiendo la nota al pie de un error \
concreto, para un jugador argentino de ~1880 FIDE. Hablás de vos, en rioplatense, \
sin solemnidad.

Te paso EVIDENCIA YA CALCULADA por motores. Tu trabajo es redactarla en prosa, \
no analizar la posición.

Reglas, en orden de importancia:

1. No inventes NADA. No agregues variantes, planes, nombres de aperturas ni \
   motivos tácticos que no estén en la evidencia. Si algo no está, no existe.
2. No repitas los números en crudo. Traducilos. "material -0.26 -> -0.37, \
   posicional +0.80 -> -0.62" se dice "no perdiste material: perdiste la posición".
3. Fijate CUÁNDO cae la evaluación en la línea de tiempo. Si se mantiene varias \
   medias jugadas y recién cae después, el error no fue no ver una táctica \
   inmediata: fue no ver adónde iba la posición. Decilo.
4. Las piezas "culpables" son las que se volvieron más peligrosas por culpa de \
   la jugada, medido sacándolas del tablero. Nombralas por casilla.
5. Si viene la escalera de Maia, usala para situar el error: son ratings de \
   LICHESS (1900 de Lichess es del orden de 1750-1800 FIDE), o sea que la \
   escalera termina algo por debajo del jugador. Nunca digas "un 1900 FIDE".
6. Si la evidencia no alcanza para una explicación clara, decilo en una línea \
   en vez de rellenar.

Formato: 2 a 4 oraciones. Sin títulos, sin viñetas, sin markdown. Texto plano."""


def _explain_prompt(row: dict) -> str:
    """Arma la hoja de hechos. Solo datos de motor, nada interpretado acá."""
    lines = [
        f"Jugué con {'blancas' if row['color'] == 'W' else 'negras'}, jugada {(row['ply'] + 1) // 2}.",
        f"FEN antes de mi jugada: {row['fen']}",
        f"Jugué: {row['move_played']}   Pérdida: {row['cp_loss']} centipeones",
        f"Categoría: {row['category']}",
        "",
        "Lo que quería Stockfish (evaluación desde mi lado, en centipeones):",
    ]
    for c in row["sf_top3"]:
        policy = c.get("maia_policy")
        human = f", policy de Maia-1900 {policy * 100:.1f}%" if policy is not None else ""
        lines.append(f"  {c['rank']}. {c['move_san']} = {c['eval_cp']}{human}")
        if c.get("line"):
            lines.append(f"     línea: {c['line']}")

    lines.append("")
    lines.append(f"Maia-1900 (rating de Lichess) juega acá: {row['maia_top_move']}")
    if row.get("maia_policy_played") is not None:
        lines.append(f"  policy de mi jugada: {float(row['maia_policy_played']) * 100:.1f}%")

    ladder = row.get("maia_ladder")
    if ladder:
        lines.append("")
        lines.append("Escalera de Maia (ratings de LICHESS) — ¿a este nivel se juega mi jugada?:")
        for rating in sorted(ladder, key=int):
            step = ladder[rating]
            mark = "SÍ, es su jugada top" if step.get("played_is_top") else f"no, juega {step.get('top_move')}"
            lines.append(f"  {rating}: {mark} (policy de mi jugada {step['played'] * 100:.1f}%)")

    ev = row.get("evidence") or {}
    if ev.get("timeline"):
        lines.append("")
        lines.append("Cómo evoluciona la evaluación en la continuación REAL de la partida:")
        for step in ev["timeline"]:
            value = "fin de partida" if step.get("eval_cp") is None else str(step["eval_cp"])
            lines.append(f"  {step['san']}: {value}")
    if ev.get("culprits"):
        lines.append("")
        lines.append("Piezas rivales que se volvieron más peligrosas por mi jugada")
        lines.append("(medido sacándolas del tablero, en centipeones):")
        for c in ev["culprits"]:
            lines.append(f"  {c['piece']} en {c['square']}: {c['blame_cp']}")
    mp = (ev.get("material_positional") or {})
    if mp.get("before") and mp.get("after"):
        lines.append("")
        lines.append("Desglose de Stockfish, en peones, desde el lado de las blancas:")
        lines.append(f"  antes:   material {mp['before']['material']:+.2f}, posicional {mp['before']['positional']:+.2f}")
        lines.append(f"  después: material {mp['after']['material']:+.2f}, posicional {mp['after']['positional']:+.2f}")
    st = ev.get("structure") or {}
    if st.get("before") and st.get("after"):
        b, a = st["before"], st["after"]
        lines.append("")
        lines.append("Estructura, antes -> después:")
        lines.append(f"  mi movilidad: {b['mobility']['mine']} -> {a['mobility']['mine']}")
        lines.append(f"  movilidad rival: {b['mobility']['theirs']} -> {a['mobility']['theirs']}")
        lines.append(f"  atacantes cerca de mi rey: {b['king_pressure']['on_me']} -> {a['king_pressure']['on_me']}")
        def pawns(d: dict) -> str:
            bits = [f"{v} {k}" for k, v in d.items() if v]
            return ", ".join(bits) if bits else "sanos"
        lines.append(f"  mis peones: {pawns(b['pawns']['mine'])} -> {pawns(a['pawns']['mine'])}")
        lines.append(f"  peones rivales: {pawns(b['pawns']['theirs'])} -> {pawns(a['pawns']['theirs'])}")
    return "\n".join(lines)


def _narrator(args):
    """Devuelve `(fn, etiqueta)` donde fn(system, prompt) -> texto o None.

    None significa "el modelo declinó", que no es lo mismo que un error: se
    saltea el hallazgo y la corrida sigue.
    """
    if args.explain_provider == "xai":
        try:
            from openai import OpenAI
        except ImportError:
            sys.exit("Falta el SDK: pip install openai")
        if not os.environ.get("XAI_API_KEY"):
            sys.exit("Falta XAI_API_KEY. Agregala a .env.local o exportala en el entorno.")
        model = args.explain_model or XAI_MODEL
        # La API de xAI es compatible con la de OpenAI, así que se usa ese SDK
        # apuntado a su base URL. No sirve el de Anthropic.
        # Timeout y reintentos explícitos: son 88 llamadas seguidas, y sin
        # tope una sola colgada frena la pasada entera sin decir nada.
        client = OpenAI(
            api_key=os.environ["XAI_API_KEY"],
            base_url=XAI_BASE_URL,
            timeout=180.0,
            max_retries=3,
        )

        def generate(system: str, prompt: str) -> str | None:
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                # `reasoning` es una extensión de xAI: el SDK de OpenAI rechaza
                # los parámetros que no conoce como argumento directo, así que
                # va en extra_body para llegar tal cual al cuerpo del request.
                extra_body={"reasoning": {"effort": args.explain_effort}},
            )
            return (completion.choices[0].message.content or "").strip() or None

        return generate, f"{model}/{args.explain_effort}"

    try:
        import anthropic
    except ImportError:
        sys.exit("Falta el SDK: pip install anthropic")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit(
            "Falta ANTHROPIC_API_KEY. Agregala a .env.local (ya figura comentada "
            "en .env.example) o exportala en el entorno."
        )
    model = args.explain_model or EXPLAIN_MODEL
    client = anthropic.Anthropic(timeout=180.0, max_retries=3)

    def generate(system: str, prompt: str) -> str | None:
        message = client.messages.create(
            model=model,
            max_tokens=8000,
            thinking={"type": "adaptive"},
            output_config={"effort": args.explain_effort},
            # El sistema no cambia entre hallazgos: cachearlo evita pagarlo una
            # vez por fila.
            system=[{"type": "text", "text": system,
                     "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": prompt}],
        )
        if message.stop_reason == "refusal":
            return None
        return "\n".join(b.text for b in message.content if b.type == "text").strip() or None

    return generate, f"{model}/{args.explain_effort}"


def run_explain(conn, args) -> int:
    """Convierte la evidencia en prosa, una vez por hallazgo, y la cachea."""
    generate, label = _narrator(args)

    where = "evidence IS NOT NULL" + ("" if args.force else " AND explanation IS NULL")
    params: list = []
    sql = f"""SELECT d.id::text, d.ply, d.fen, d.move_played, d.cp_loss, d.sf_top3,
                     d.maia_top_move, d.maia_policy_played, d.maia_ladder, d.evidence,
                     d.category, g.color
                FROM position_diagnostics d JOIN games g ON g.id = d.game_id
               WHERE {where}"""
    if args.game_id:
        sql += " AND d.game_id = %s"
        params.append(args.game_id)
    sql += " ORDER BY d.cp_loss DESC"
    if args.limit:
        sql += " LIMIT %s"
        params.append(args.limit)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]
    if not rows:
        print("No hay hallazgos con evidencia pendientes de explicar. "
              "¿Corriste --evidence primero?")
        return 0

    print(f"{len(rows)} hallazgos a explicar con {label}.")
    done = 0
    try:
        for index, row in enumerate(rows, start=1):
            text = generate(EXPLAIN_SYSTEM, _explain_prompt(row))
            if not text:
                print(f"[{index}/{len(rows)}] {row['move_played']} — sin respuesta, salteando")
                continue
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE position_diagnostics SET explanation = %s, explained_with = %s WHERE id = %s",
                    (text, label, row["id"]),
                )
            conn.commit()
            done += 1
            print(f"[{index}/{len(rows)}] {row['move_played']} ({row['cp_loss']}cp) — explicado")
    except KeyboardInterrupt:
        print("\nInterrumpido. Lo explicado quedó guardado.", file=sys.stderr)
    print(f"{done} explicaciones guardadas.")
    return 0



# --- Patrones: agrupar lo ya explicado --------------------------------------

PATTERNS_SYSTEM = """Agrupás errores de ajedrez ya diagnosticados en TEMAS de estudio, \
para un jugador argentino de ~1880 FIDE.

Te paso una lista de divergencias. Cada una ya viene con su explicación, \
calculada a partir de motores. Tu trabajo es encontrar qué tienen en común, no \
volver a analizarlas.

Reglas:
1. Agrupá por MECANISMO, no por resultado. "Perdí material" no es un tema; \
   "cambio piezas menores sin mirar la estructura que queda" sí.
2. Un tema necesita al menos dos divergencias. Una sola es una anécdota.
3. No fuerces: es mejor devolver tres temas sólidos y dejar el resto afuera que \
   inventar categorías para que entre todo.
4. No inventes ajedrez. Solo podés usar lo que dicen las explicaciones que te paso.
5. `study_note` es la parte accionable: qué hacer esta semana al respecto. \
   Concreto. Si no se te ocurre nada concreto, dejalo vacío.

Escribí en rioplatense, de vos, sin solemnidad."""

PATTERNS_SCHEMA = {
    "type": "object",
    "properties": {
        "patterns": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nombre corto del tema."},
                    "summary": {"type": "string", "description": "Qué es, en 1-2 oraciones."},
                    "study_note": {"type": "string", "description": "Qué hacer al respecto."},
                    "finding_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Los id de las divergencias que caen acá.",
                    },
                },
                "required": ["name", "summary", "study_note", "finding_ids"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["patterns"],
    "additionalProperties": False,
}


def run_patterns(conn, args) -> int:
    """Agrupa las divergencias explicadas en temas de estudio.

    Trabaja sobre las explicaciones, no sobre las posiciones: el modelo agrupa
    textos, no analiza ajedrez. Va en UNA sola llamada con todas las
    divergencias porque el agrupamiento necesita verlas juntas — es justamente
    lo que no se puede hacer de a una.

    Los dos proveedores soportan salida estructurada, pero la configuran
    distinto: Anthropic con output_config.format, xAI con el response_format de
    OpenAI. El esquema es el mismo, así que la comparación sigue siendo justa.
    """
    # Primero si hay material, después la clave: sin explicaciones el paso
    # siguiente es correr --explain, no ir a buscar una API key.
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT d.id::text, d.category, d.cp_loss, d.move_played, d.explanation,
                   d.sf_top3 -> 0 ->> 'move_san' AS best_move, g.opponent
              FROM position_diagnostics d JOIN games g ON g.id = d.game_id
             WHERE d.explanation IS NOT NULL
             ORDER BY d.cp_loss DESC
        """)
        rows = [dict(r) for r in cur.fetchall()]
    if len(rows) < 4:
        print(f"Solo {len(rows)} divergencias explicadas: con eso no hay patrones, "
              "hay anécdotas. Corré --evidence y --explain primero.")
        return 0


    lines = [f"{len(rows)} divergencias ya diagnosticadas y explicadas:\n"]
    for r in rows:
        lines.append(
            f"id: {r['id']}\n"
            f"  categoría: {r['category']}, pérdida {r['cp_loss']}cp\n"
            f"  jugó {r['move_played']}, el motor quería {r['best_move']}\n"
            f"  explicación: {r['explanation']}\n"
        )

    prompt = "\n".join(lines)
    if args.explain_provider == "xai":
        try:
            from openai import OpenAI
        except ImportError:
            sys.exit("Falta el SDK: pip install openai")
        if not os.environ.get("XAI_API_KEY"):
            sys.exit("Falta XAI_API_KEY. Agregala a .env.local o exportala.")
        model = args.explain_model or XAI_MODEL
        print(f"Agrupando {len(rows)} divergencias con {model}...")
        client = OpenAI(api_key=os.environ["XAI_API_KEY"], base_url=XAI_BASE_URL,
                        timeout=300.0, max_retries=3)
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": PATTERNS_SYSTEM},
                      {"role": "user", "content": prompt}],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "patrones", "schema": PATTERNS_SCHEMA,
                                "strict": True},
            },
            extra_body={"reasoning": {"effort": args.explain_effort}},
        )
        payload = json.loads(completion.choices[0].message.content or "{}")
    else:
        try:
            import anthropic
        except ImportError:
            sys.exit("Falta el SDK: pip install anthropic")
        if not os.environ.get("ANTHROPIC_API_KEY"):
            sys.exit("Falta ANTHROPIC_API_KEY. Agregala a .env.local o exportala.")
        model = args.explain_model or EXPLAIN_MODEL
        print(f"Agrupando {len(rows)} divergencias con {model}...")
        client = anthropic.Anthropic(timeout=300.0, max_retries=3)
        message = client.messages.create(
            model=model,
            max_tokens=16000,
            thinking={"type": "adaptive"},
            output_config={
                "effort": args.explain_effort,
                "format": {"type": "json_schema", "schema": PATTERNS_SCHEMA},
            },
            system=PATTERNS_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        if message.stop_reason == "refusal":
            sys.exit("El modelo declinó agrupar.")
        payload = json.loads(
            "".join(b.text for b in message.content if b.type == "text")
        )
    patterns = payload.get("patterns", [])
    known = {r["id"] for r in rows}

    label = f"{model}/{args.explain_effort}"
    saved = 0
    with conn.cursor() as cur:
        if args.force:
            cur.execute("DELETE FROM diagnostic_patterns")
        for pat in patterns:
            # Solo ids que existen: si el modelo inventó uno, se descarta en vez
            # de guardar una referencia rota.
            ids = [i for i in pat.get("finding_ids", []) if i in known]
            if len(ids) < 2:
                continue
            cur.execute(
                """INSERT INTO diagnostic_patterns
                     (name, summary, study_note, finding_ids, grouped_with)
                   VALUES (%s, %s, %s, %s::uuid[], %s)""",
                (pat["name"], pat["summary"], pat.get("study_note") or None, ids, label),
            )
            saved += 1
    conn.commit()

    print(f"\n## {saved} temas de estudio\n")
    for pat in patterns:
        ids = [i for i in pat.get("finding_ids", []) if i in known]
        if len(ids) < 2:
            continue
        print(f"### {pat['name']} ({len(ids)} divergencias)")
        print(f"{pat['summary']}")
        if pat.get("study_note"):
            print(f"→ {pat['study_note']}")
        print()
    return 0

