#!/usr/bin/env python3
"""
Diagnóstico de posiciones: dónde mi jugada se separa de Stockfish, y por qué.

Recorre las partidas de `games` y, en cada posición donde me tocaba mover,
corre DOS motores sobre el mismo FEN:

  - Stockfish, profundidad fija, multipv 3 -> qué es objetivamente mejor.
  - Maia-1900 (lc0 + pesos de Maia, búsqueda nula) -> qué juega un 1900 típico.

Cruzar los dos separa tres cosas que un análisis de un solo motor mezcla:

  brecha_conceptual  Jugué exactamente la jugada top de Maia-1900 y estaba mal
                     (>= 50cp). No es un descuido: es un error compartido por
                     toda una banda de rating. Es la categoría que más enseña.

                     OJO con el rating: Maia usa la escala de LICHESS, no FIDE.
                     Se entrenó con partidas de Lichess y sus bins son de ese
                     pool, que está inflado respecto de FIDE. Maia-1900 modela a
                     un ~1900 de Lichess, del orden de 1750-1800 FIDE: un poco
                     por debajo de los 1880 FIDE de Lucas, no a la par. Así que
                     una brecha es "jugué como alguien algo más débil que yo",
                     que es más accionable, no menos. Y 1900 es el techo: la
                     escalera no puede decir si un 2100 comete el mismo error.
  jugada_inhumana    La jugada de Stockfish tiene < 5% de policy en Maia. El
                     motor ve algo fuera del radar humano. Instructivo, pero no
                     es "mi" error.
  error_propio       Pérdida >= 100cp que no cae en ninguna de las anteriores.

Corre LOCAL, fuera de Vercel. No toca la app: solo lee `games` y escribe en
`position_diagnostics`. NO crea tablas — eso lo hace a mano
migrations/001_position_diagnostics.sql.

Setup (una vez):

    brew install lc0 stockfish
    pip install chess psycopg2-binary
    mkdir -p engines && curl -L -o engines/maia-1900.pb.gz \
      https://github.com/CSSLab/maia-chess/releases/download/v1.0/maia-1900.pb.gz
    psql "$DATABASE_URL" -f migrations/001_position_diagnostics.sql

Uso:

    python3 scripts/position_diagnostics.py --dry-run --limit 1
    python3 scripts/position_diagnostics.py --source otb           # las 51 OTB, ~2.5h
    python3 scripts/position_diagnostics.py --limit 50             # de a tandas, retomable
    python3 scripts/position_diagnostics.py --requested            # lo pedido desde la app
    python3 scripts/position_diagnostics.py                        # las 491, ~23h
    python3 scripts/position_diagnostics.py --game-id <uuid> --force

DATABASE_URL sale del entorno o, si no está, de .env.local (el repo no usa
dotenv: los scripts Node leen ese archivo con `node --env-file=.env.local`).

Es idempotente: una partida ya registrada en position_diagnostics_runs se
saltea, salvo --force. Commitea por partida, así una corrida de horas se puede
cortar con Ctrl-C y retomar sin perder lo hecho. Por eso `--limit N` repetido es
una forma cómoda de hacer el corpus entero de a tandas: cada corrida arranca por
donde quedó la anterior.

Costo medido: ~5.6s por posición a profundidad 20 en un M2 Pro, y hay 14.888
posiciones mías en las 491 partidas con PGN. Las 51 OTB son ~2.5h, el corpus
completo ~23h.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import chess
import chess.engine
import chess.pgn
import psycopg2
import psycopg2.extras

from diagnostics.analysis import Finding, analyze_game
from diagnostics.config import (
    REPO_ROOT, connect, env_from_dotenv, load_api_keys, load_database_url,
    with_reconnect,
)
from diagnostics.engines import MaiaEngine, engine_id
# _POLICY_RE: andamio para que el test lo siga viendo por acá. Se va en el
# paso final, cuando el test pase a importar el paquete.
from diagnostics.engines import _POLICY_RE  # noqa: F401
from diagnostics.pgn import parse_moves, sanitize_pgn
from diagnostics.rules import (
    BRECHA_MIN_CP_LOSS, CP_LOSS_CAP, DEFAULT_DEPTH, ERROR_PROPIO_MIN_CP_LOSS,
    EVAL_CEILING_CP, FIRST_FULLMOVE, INHUMAN_MAX_CP_LOSS, INHUMAN_MIN_CP_LOSS,
    INHUMAN_POLICY, MAIA_RATINGS, MATE_SCORE, MULTIPV, PV_PLIES,
    classify, classifier_id,
)
from diagnostics.store import (
    already_done, clear_request, fetch_games, persist, print_summary,
    request_forces, tables_exist,
)


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


# --- Trampas ----------------------------------------------------------------


def run_traps(conn, args) -> int:
    """Busca posiciones donde el rival tenía una forma natural de equivocarse.

    Da vuelta la pregunta del resto del script: en vez de mirar mis jugadas,
    mira las posiciones donde movía el rival y pregunta si lo que un humano de
    esa banda juega por instinto está mal. Sirve para preparación — son las
    posiciones a las que conviene llevar la partida.

    El orden importa para el costo: Maia primero, que es casi gratis, y
    Stockfish solo donde hay algo que verificar. Aun así es una pasada completa
    de motor, así que va aparte y con su propia profundidad.
    """
    database_url = load_database_url()
    where = ["pgn IS NOT NULL", "length(pgn) > 60"]
    params: list = []
    if args.game_id:
        where.append("id = %s")
        params.append(args.game_id)
    if args.source:
        where.append("source = %s")
        params.append(args.source)
    if not args.force:
        where.append("id NOT IN (SELECT game_id FROM position_traps_runs)")
    sql = f"""SELECT id::text AS id, color, opponent, opponent_elo, eco, pgn
                FROM games WHERE {' AND '.join(where)}
               ORDER BY (source = 'otb') DESC, played_date DESC NULLS LAST"""
    if args.limit:
        sql += " LIMIT %s"
        params.append(args.limit)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        games = [dict(r) for r in cur.fetchall()]
    if not games:
        print("No hay partidas a las que buscarles trampas.")
        return 0

    sf = chess.engine.SimpleEngine.popen_uci(args.stockfish_path)
    sf.configure({"Threads": args.threads, "Hash": args.hash})
    maia = MaiaEngine(args.lc0_path, args.maia_weights, args.policy_temperature)
    limit = chess.engine.Limit(depth=args.trap_depth)
    trap_engine = engine_id(args.stockfish_path)
    total = 0
    try:
        for index, row in enumerate(games, start=1):
            moves = parse_moves(row["pgn"])
            if not moves:
                continue
            my_color = chess.WHITE if row["color"] == "W" else chess.BLACK
            board = chess.Board()
            found: list[tuple] = []
            evaluated = 0
            for played in moves:
                if board.turn == my_color or board.fullmove_number < FIRST_FULLMOVE:
                    board.push(played)
                    continue
                # Maia primero: dice qué jugaría un humano de esta banda, y es
                # una pasada por la red. Si coincide con la mejor del motor no
                # hay trampa que buscar y nos ahorramos la búsqueda cara.
                policies = maia.policy(board)
                maia_uci = max(policies, key=policies.__getitem__)
                maia_move = chess.Move.from_uci(maia_uci)

                best = sf.analyse(board, limit)
                evaluated += 1
                best_move = best["pv"][0] if best.get("pv") else None
                if best_move is None or best_move == maia_move:
                    board.push(played)
                    continue
                # Todo desde el lado del RIVAL, que es quien mueve acá.
                them = board.turn
                best_cp = best["score"].pov(them).score(mate_score=MATE_SCORE)
                natural = sf.analyse(board, limit, root_moves=[maia_move])
                natural_cp = natural["score"].pov(them).score(mate_score=MATE_SCORE)
                trap_cp = best_cp - natural_cp
                if trap_cp >= args.trap_min_cp:
                    found.append((
                        row["id"], board.ply() + 1, board.fen(),
                        board.san(maia_move), round(policies.get(maia_uci, 0.0), 4),
                        board.san(best_move), trap_cp,
                        board.san(played), played == maia_move, row["eco"],
                    ))
                board.push(played)

            def save(c, _found=found, _gid=row["id"], _n=evaluated,
                     _engine=trap_engine, _cls=f"trampa>={args.trap_min_cp}"):
                with c.cursor() as cur:
                    cur.execute("DELETE FROM position_traps WHERE game_id = %s", (_gid,))
                    for f in _found:
                        cur.execute(
                            """INSERT INTO position_traps
                                 (game_id, ply, fen, maia_move, maia_policy, best_move,
                                  trap_cp, opponent_move, fell_for_it, eco)
                               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", f)
                    cur.execute(
                        """INSERT INTO position_traps_runs
                             (game_id, depth, positions, traps, engine, classifier)
                           VALUES (%s,%s,%s,%s,%s,%s)
                           ON CONFLICT (game_id) DO UPDATE
                             SET analyzed_at = now(), depth = EXCLUDED.depth,
                                 positions = EXCLUDED.positions, traps = EXCLUDED.traps,
                                 engine = EXCLUDED.engine, classifier = EXCLUDED.classifier""",
                        (_gid, args.trap_depth, _n, len(_found), _engine, _cls))
                c.commit()
            if not args.dry_run:
                _, conn = with_reconnect(conn, database_url, save)
            fell = sum(1 for f in found if f[8])
            total += len(found)
            print(f"[{index}/{len(games)}] {row['opponent']} — {evaluated} posiciones, "
                  f"{len(found)} trampas, cayó en {fell}")
    except KeyboardInterrupt:
        print("\nInterrumpido. Lo encontrado quedó guardado.", file=sys.stderr)
    finally:
        sf.quit()
        maia.close()
    print(f"\n{total} trampas encontradas.")
    return 0


# --- Evidencia: reconstruir el "por qué" ------------------------------------
# Stockfish no sabe por qué evalúa lo que evalúa (ver migración 004). Lo que
# sigue le pregunta cosas que sí puede contestar y arma con eso la explicación.

# La ablación es comparativa, no necesita la profundidad del análisis principal.
EVIDENCE_DEPTH = 12
# Cuántas piezas culpables se guardan. Más de tres deja de ser una explicación.
CULPRITS = 3

_PSQT_RE = re.compile(r"\|\s*\d+\s*\|\s*([-+])\s*([\d.]+)\s*\|\s*([-+])\s*([\d.]+).*<-- this bucket is used")


def _material_positional(sf_path: str, board: chess.Board) -> dict | None:
    """Separa material (PSQT) de posicional (capas) con el comando `eval`.

    Es la única introspección honesta que da Stockfish: dice si la evaluación
    viene de la madera o de la posición. No hay desglose por pieza.
    """
    try:
        out = subprocess.run(
            [sf_path], input=f"position fen {board.fen()}\neval\nquit\n",
            capture_output=True, text=True, timeout=30,
        ).stdout
    except (subprocess.SubprocessError, OSError):
        return None
    for line in out.splitlines():
        match = _PSQT_RE.search(line)
        if match:
            sign_m, mat, sign_p, pos = match.groups()
            return {
                "material": float(mat) * (1 if sign_m == "+" else -1),
                "positional": float(pos) * (1 if sign_p == "+" else -1),
            }
    return None


def _structure(board: chess.Board, me: chess.Color) -> dict:
    """Rasgos posicionales computables, sin motor: los que se pueden nombrar."""
    def mobility(color: chess.Color) -> int:
        probe = board.copy()
        probe.turn = color
        return probe.legal_moves.count()

    def pawn_defects(color: chess.Color) -> dict:
        files = [chess.square_file(sq) for sq in board.pieces(chess.PAWN, color)]
        counts = {f: files.count(f) for f in set(files)}
        return {
            "doubled": sum(n - 1 for n in counts.values() if n > 1),
            "isolated": sum(
                n for f, n in counts.items()
                if (f - 1) not in counts and (f + 1) not in counts
            ),
        }

    def king_pressure(color: chess.Color) -> int:
        """Atacantes enemigos tocando el anillo del rey de `color`."""
        king = board.king(color)
        if king is None:
            return 0
        ring = chess.SquareSet(chess.BB_KING_ATTACKS[king])
        return sum(len(board.attackers(not color, sq)) for sq in ring)

    return {
        "mobility": {"mine": mobility(me), "theirs": mobility(not me)},
        "pawns": {"mine": pawn_defects(me), "theirs": pawn_defects(not me)},
        "king_pressure": {"on_me": king_pressure(me), "on_them": king_pressure(not me)},
    }


def _culprits(sf, before: chess.Board, after: chess.Board, me: chess.Color, depth: int) -> list[dict]:
    """Qué pieza enemiga se volvió peligrosa por culpa de mi jugada.

    Ablación en diferencia-en-diferencias: se saca la misma pieza en la posición
    de antes y en la de después, y se compara cuánto mejora mi evaluación en
    cada caso. Sacar sin comparar solo mide el valor de la pieza (borrar la dama
    "recupera" nueve peones y no explica nada); la diferencia de diferencias
    cancela eso y deja cuánto MÁS estorba esa pieza después de mi jugada.
    """
    limit = chess.engine.Limit(depth=depth)

    def ev(board: chess.Board) -> int | None:
        # Sacar una pieza puede dejar una posición que ningún motor acepta (el
        # rey que no mueve queda en jaque, por ejemplo). Se descarta antes de
        # mandarla: un UCI que recibe una posición ilegal se cae y se lleva
        # puesta toda la pasada.
        if not board.is_valid():
            return None
        probe = board.copy()
        probe.clear_stack()
        return sf.analyse(probe, limit)["score"].pov(me).score(mate_score=MATE_SCORE)

    ev_before, ev_after = ev(before), ev(after)
    if ev_before is None or ev_after is None:
        return []
    scored: list[dict] = []
    for square, piece in after.piece_map().items():
        if piece.color == me or piece.piece_type == chess.KING:
            continue
        if before.piece_at(square) != piece:  # solo piezas presentes en ambas
            continue
        try:
            b2 = before.copy(); b2.remove_piece_at(square)
            a2 = after.copy(); a2.remove_piece_at(square)
            ev_a2, ev_b2 = ev(a2), ev(b2)
            if ev_a2 is None or ev_b2 is None:
                continue
            delta = (ev_a2 - ev_after) - (ev_b2 - ev_before)
        except (chess.engine.EngineError, ValueError):
            continue
        scored.append({
            "piece": piece.symbol(),
            "square": chess.square_name(square),
            "blame_cp": delta,
        })
    scored.sort(key=lambda c: -c["blame_cp"])
    return scored[:CULPRITS]


def _eval_timeline(sf, board: chess.Board, line: list[chess.Move], me: chess.Color,
                   depth: int) -> list[dict]:
    """Eval después de cada media jugada de la continuación real.

    Contesta CUÁNDO cae la evaluación. Muy seguido no cae en la jugada que uno
    señala, sino dos o tres plies después, cuando la táctica aterriza: eso mueve
    la lección de "esta jugada es mala" a "no viste esto que venía".
    """
    limit = chess.engine.Limit(depth=depth)
    probe = board.copy()
    timeline = []
    for move in line:
        if move not in probe.legal_moves:
            break
        san = probe.san(move)
        probe.push(move)
        if probe.is_game_over():
            timeline.append({"san": san, "eval_cp": None, "over": True})
            break
        scratch = probe.copy(); scratch.clear_stack()
        timeline.append({
            "san": san,
            "eval_cp": sf.analyse(scratch, limit)["score"].pov(me).score(mate_score=MATE_SCORE),
        })
    return timeline


def run_evidence(conn, args) -> int:
    """Rellena `evidence` en los hallazgos que no la tienen.

    Pasada aparte del análisis principal por dos razones: usa una profundidad
    mucho menor (la ablación es comparativa, no necesita 20), y se puede
    recalcular cuando cambie la forma de la evidencia sin re-correr Stockfish a
    profundidad completa sobre todo el corpus.
    """
    where = "evidence IS NULL" if not args.force else "TRUE"
    params: list = []
    sql = f"""SELECT d.id::text, d.fen, d.move_played, d.sf_top3, g.pgn, g.color
                FROM position_diagnostics d JOIN games g ON g.id = d.game_id
               WHERE {where}"""
    if args.game_id:
        sql += " AND d.game_id = %s"
        params.append(args.game_id)
    sql += " ORDER BY d.game_id, d.ply"
    if args.limit:
        sql += " LIMIT %s"
        params.append(args.limit)
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    if not rows:
        print("No hay hallazgos a los que calcularles evidencia.")
        return 0

    sf = chess.engine.SimpleEngine.popen_uci(args.stockfish_path)
    sf.configure({"Threads": args.threads, "Hash": args.hash})
    database_url = load_database_url()
    engine = engine_id(args.stockfish_path)
    depth = args.evidence_depth
    done = 0
    try:
        for index, (row_id, fen, move_played, sf_top3, pgn, color) in enumerate(rows, start=1):
            me = chess.WHITE if color == "W" else chess.BLACK
            before = chess.Board(fen)
            try:
                played = before.parse_san(move_played)
            except ValueError:
                continue
            after = before.copy()
            after.push(played)

            # La continuación REAL de la partida desde acá, no la que sugiere el
            # motor: la pregunta es cuándo se cayó tu partida, no una hipotética.
            moves = parse_moves(pgn)
            played_at = before.ply()
            continuation = moves[played_at : played_at + PV_PLIES]

            evidence = {
                "depth": depth,
                "timeline": _eval_timeline(sf, before, continuation, me, depth),
                "culprits": _culprits(sf, before, after, me, depth),
                "material_positional": {
                    "before": _material_positional(args.stockfish_path, before),
                    "after": _material_positional(args.stockfish_path, after),
                },
                "structure": {
                    "before": _structure(before, me),
                    "after": _structure(after, me),
                },
            }
            def save(c, _ev=evidence, _id=row_id, _engine=engine):
                with c.cursor() as cur:
                    cur.execute(
                        """UPDATE position_diagnostics
                              SET evidence = %s, evidence_engine = %s WHERE id = %s""",
                        (psycopg2.extras.Json(_ev), _engine, _id),
                    )
                c.commit()
            _, conn = with_reconnect(conn, database_url, save)
            done += 1
            print(f"[{index}/{len(rows)}] {move_played} — evidencia lista")
    except KeyboardInterrupt:
        print("\nInterrumpido. La evidencia calculada quedó guardada.", file=sys.stderr)
    finally:
        sf.quit()
    print(f"Evidencia en {done} hallazgos.")
    return 0


def run_drills_policy(conn, args) -> int:
    """Marca qué tan encontrable es la solución de cada blunder drill.

    Los drills se minan por pérdida de centipeones nada más, así que entran
    posiciones donde la jugada correcta tiene 1% de policy: irresolubles en el
    tablero para esta banda. Con la policy guardada se pueden separar los drills
    que entrenan de los que solo se miran.
    """
    where = "maia_policy IS NULL" if not args.force else "TRUE"
    with conn.cursor() as cur:
        cur.execute(f"SELECT id::text, fen_before, best_move_uci FROM blunder_drills WHERE {where}")
        rows = cur.fetchall()
    if not rows:
        print("Todos los drills ya tienen policy.")
        return 0

    maia = MaiaEngine(args.lc0_path, args.maia_weights, args.policy_temperature)
    done = 0
    try:
        for index, (drill_id, fen, best_uci) in enumerate(rows, start=1):
            try:
                board = chess.Board(fen)
            except ValueError:
                continue
            policies = maia.policy(board)
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE blunder_drills SET maia_policy = %s WHERE id = %s",
                    (round(policies.get(best_uci, 0.0), 4), drill_id),
                )
            done += 1
            if index % 100 == 0:
                conn.commit()
                print(f"  {index}/{len(rows)}")
    except KeyboardInterrupt:
        print("\nInterrumpido.", file=sys.stderr)
    finally:
        conn.commit()
        maia.close()
    print(f"Policy calculada en {done} drills.")
    return 0


# --- La voz: narrar la evidencia --------------------------------------------
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


# --- Escalera de Maia -------------------------------------------------------

def run_ladder(conn, args) -> int:
    """Rellena maia_ladder en los hallazgos que no la tienen.

    Pasada aparte y no parte del análisis principal: Maia es casi gratis y
    Stockfish no, así que la escalera se puede recalcular sin re-analizar nada.
    Recorre rating por rating en vez de posición por posición para abrir un solo
    lc0 a la vez en lugar de nueve.
    """
    where = "maia_ladder IS NULL" if not args.force else "TRUE"
    params: list = []
    sql = f"SELECT id::text, fen, move_played, sf_top3 FROM position_diagnostics WHERE {where}"
    if args.game_id:
        sql += " AND game_id = %s"
        params.append(args.game_id)
    sql += " ORDER BY game_id, ply"
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    if not rows:
        print("No hay hallazgos a los que calcularles la escalera.")
        return 0

    weights_dir = Path(args.maia_weights).parent
    # {row_id: {rating: {...}}}
    ladders: dict[str, dict] = {row[0]: {} for row in rows}
    print(f"{len(rows)} hallazgos × {len(MAIA_RATINGS)} modelos de Maia.")

    for rating in MAIA_RATINGS:
        weights = weights_dir / f"maia-{rating}.pb.gz"
        if not weights.exists():
            print(f"  falta {weights}, salteando {rating}")
            continue
        engine = MaiaEngine(args.lc0_path, str(weights), args.policy_temperature)
        try:
            for row_id, fen, move_played, sf_top3 in rows:
                board = chess.Board(fen)
                try:
                    played_uci = board.parse_san(move_played).uci()
                except ValueError:
                    continue
                policies = engine.policy(board)
                top_uci = max(policies, key=policies.__getitem__)
                sf_top_uci = sf_top3[0]["move_uci"] if sf_top3 else None
                ladders[row_id][str(rating)] = {
                    "played": round(policies.get(played_uci, 0.0), 4),
                    "sf_top": round(policies.get(sf_top_uci, 0.0), 4) if sf_top_uci else None,
                    "top_move": board.san(chess.Move.from_uci(top_uci)),
                    # Lo que más importa: ¿a este rating todavía se juega mi error?
                    "played_is_top": top_uci == played_uci,
                }
        finally:
            engine.close()
        print(f"  {rating} listo")

    with conn.cursor() as cur:
        for row_id, ladder in ladders.items():
            if ladder:
                cur.execute(
                    "UPDATE position_diagnostics SET maia_ladder = %s WHERE id = %s",
                    (psycopg2.extras.Json(ladder), row_id),
                )
    conn.commit()
    print(f"Escalera guardada en {sum(1 for l in ladders.values() if l)} hallazgos.")
    return 0


# --- Main -------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Cruza Stockfish contra Maia-1900 en mis posiciones y clasifica las divergencias.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--limit", type=int, help="Analizar como mucho N partidas.")
    p.add_argument("--depth", type=int, default=DEFAULT_DEPTH, help=f"Profundidad de Stockfish (default {DEFAULT_DEPTH}).")
    p.add_argument("--game-id", help="Analizar una sola partida, por UUID.")
    p.add_argument("--force", action="store_true", help="Re-analizar partidas ya procesadas.")
    p.add_argument("--dry-run", action="store_true", help="Analizar e imprimir sin escribir en la DB.")
    p.add_argument("--source", choices=["otb", "lichess"], help="Filtrar por origen.")
    p.add_argument(
        "--explain-provider", default="anthropic", choices=["anthropic", "xai"],
        help="Quién redacta. El prompt es el mismo para los dos, así que sirve "
             "para compararlos sobre los mismos hallazgos.",
    )
    p.add_argument(
        "--explain-model", default=None,
        help=f"Modelo para --explain (default {EXPLAIN_MODEL} en anthropic, "
             f"{XAI_MODEL} en xai). Bajar de tier es el manijazo de costo más "
             "grande: Haiku 4.5 sale como un quinto de Opus.",
    )
    p.add_argument(
        "--explain-effort", default=EXPLAIN_EFFORT,
        choices=["low", "medium", "high", "xhigh", "max"],
        help=f"Esfuerzo de razonamiento para --explain (default {EXPLAIN_EFFORT}). "
             "Menos esfuerzo son menos tokens de salida, que es donde está el costo.",
    )
    p.add_argument(
        "--patterns",
        action="store_true",
        help="Agrupa las divergencias ya explicadas en temas de estudio. Una "
             "sola llamada al modelo con todas juntas: agrupar necesita verlas "
             "a la vez. Requiere --evidence y --explain corridos antes, y respeta "
             "--explain-provider.",
    )
    p.add_argument(
        "--traps",
        action="store_true",
        help="Da vuelta el análisis: busca posiciones donde MOVÍA EL RIVAL y lo "
             "que juega un ~1900 por instinto pierde. Son las posiciones a las "
             "que conviene llevar la partida.",
    )
    p.add_argument(
        "--trap-depth", type=int, default=16,
        help="Profundidad para --traps (default 16). Una caída de 100cp se ve "
             "sin necesidad de la profundidad del análisis principal.",
    )
    p.add_argument(
        "--trap-min-cp", type=int, default=100,
        help="Cuánto tiene que perder la jugada natural para contar como trampa "
             "(default 100).",
    )
    p.add_argument(
        "--drills-policy",
        action="store_true",
        help="Pasada aparte sobre blunder_drills: guarda qué policy le da "
             "Maia-1900 a la solución de cada drill, para separar los que un "
             "humano de esta banda puede encontrar de los que no.",
    )
    p.add_argument(
        "--explain",
        action="store_true",
        help="Pasada aparte: convierte la evidencia en prosa con Claude y la "
             "cachea. Requiere ANTHROPIC_API_KEY y haber corrido --evidence.",
    )
    p.add_argument(
        "--evidence",
        action="store_true",
        help="Pasada aparte: reconstruye el POR QUÉ de cada hallazgo ya guardado "
             "(cuándo cae el eval, qué pieza es la culpable, material vs "
             "posicional, estructura). Con --force recalcula.",
    )
    p.add_argument(
        "--evidence-depth", type=int, default=EVIDENCE_DEPTH,
        help=f"Profundidad de la pasada de evidencia (default {EVIDENCE_DEPTH}). "
             "La ablación es comparativa, no necesita la profundidad del análisis.",
    )
    p.add_argument(
        "--ladder",
        action="store_true",
        help="Pasada aparte: calcula la escalera de Maia (1100-1900) sobre los "
             "hallazgos ya guardados. No corre Stockfish. Con --force recalcula "
             "los que ya la tienen.",
    )
    p.add_argument(
        "--requested",
        action="store_true",
        help="Drenar la cola de pedidos hechos desde la app "
             "(position_diagnostics_requests). Cada pedido se borra al guardarse "
             "su análisis, en la misma transacción.",
    )
    p.add_argument(
        "--inhumana-min-cp-loss",
        type=int,
        default=INHUMAN_MIN_CP_LOSS,
        help=f"Pérdida mínima para jugada_inhumana (default {INHUMAN_MIN_CP_LOSS}). "
             "Con 0 entran divergencias de pocos centipeones, donde mi jugada era "
             "casi tan buena como la del motor.",
    )
    p.add_argument(
        "--inhumana-max-cp-loss",
        type=int,
        default=INHUMAN_MAX_CP_LOSS,
        help=f"Pérdida máxima para jugada_inhumana (default {INHUMAN_MAX_CP_LOSS}). "
             "Por encima, el error pasa a error_propio: que la jugada del motor "
             "fuera rara no explica un desastre.",
    )
    # Medido en un M2 Pro (12 cores) sobre la misma partida a profundidad 20:
    # 1 hilo 179s, 2 hilos 215s, 6 hilos 240s, 10 hilos 318s. A profundidad FIJA
    # los hilos de más ensanchan el árbol en vez de acelerar la búsqueda, así que
    # el default es 1. Para usar la máquina entera conviene correr varios procesos
    # en paralelo, no subir este número.
    p.add_argument("--threads", type=int, default=1, help="Hilos de Stockfish (default 1, ver nota en el código).")
    p.add_argument("--hash", type=int, default=512, help="Hash de Stockfish en MB.")
    p.add_argument("--stockfish-path", default=os.environ.get("STOCKFISH_PATH", "/opt/homebrew/bin/stockfish"))
    p.add_argument("--lc0-path", default=os.environ.get("LC0_PATH", "/opt/homebrew/bin/lc0"))
    p.add_argument("--maia-weights", default=os.environ.get("MAIA_WEIGHTS", str(REPO_ROOT / "engines" / "maia-1900.pb.gz")))
    p.add_argument(
        "--policy-temperature",
        type=float,
        help="Sobreescribe PolicyTemperature de lc0. Por default se usa el de lc0 "
             "(1.359), que es como se despliega Maia en la práctica. Bajarlo a 1.0 "
             "concentra la policy y hace que el umbral del 5%% marque más jugadas.",
    )
    return p


def main() -> int:
    args = build_parser().parse_args()

    no_engines = args.explain or args.patterns
    required = [] if no_engines else [("lc0", args.lc0_path), ("pesos de Maia", args.maia_weights)]
    if not (args.ladder or no_engines or args.drills_policy):
        required.insert(0, ("stockfish", args.stockfish_path))
    for label, path in required:
        if not Path(path).exists():
            sys.exit(f"No encuentro {label} en {path}. Ver el docstring del script para el setup.")

    load_api_keys()
    database_url = load_database_url()
    conn = connect(database_url)
    has_tables = tables_exist(conn, needs_queue=args.requested)
    if not has_tables:
        if not args.dry_run or args.requested:
            sys.exit(
                'Faltan las migraciones. Correlas a mano:\n'
                '  psql "$DATABASE_URL" -f migrations/001_position_diagnostics.sql\n'
                '  psql "$DATABASE_URL" -f migrations/002_position_diagnostics_requests.sql'
            )
        print("Nota: las tablas todavía no existen. En dry-run no hacen falta, "
              "pero no se puede saltear lo ya procesado.")
    if args.patterns:
        try:
            return run_patterns(conn, args)
        finally:
            conn.close()

    if args.traps:
        try:
            return run_traps(conn, args)
        finally:
            conn.close()

    if args.drills_policy:
        try:
            return run_drills_policy(conn, args)
        finally:
            conn.close()

    if args.explain:
        try:
            return run_explain(conn, args)
        finally:
            conn.close()

    if args.evidence:
        try:
            return run_evidence(conn, args)
        finally:
            conn.close()

    if args.ladder:
        try:
            return run_ladder(conn, args)
        finally:
            conn.close()

    games = fetch_games(conn, args, has_tables)
    if not games:
        print("No hay partidas para analizar (¿ya están todas procesadas? probá --force).")
        return 0

    print(f"{len(games)} partidas a analizar, profundidad {args.depth}"
          f"{' (dry-run, no se escribe nada)' if args.dry_run else ''}.")

    sf = chess.engine.SimpleEngine.popen_uci(args.stockfish_path)
    sf.configure({"Threads": args.threads, "Hash": args.hash})
    maia = MaiaEngine(args.lc0_path, args.maia_weights, args.policy_temperature)
    engine, classifier = engine_id(args.stockfish_path), classifier_id(args)
    print(f"motor: {engine} · umbrales: {classifier}")

    all_findings: list[Finding] = []
    started = time.time()
    try:
        for index, row in enumerate(games, start=1):
            forced = args.force or (args.requested and request_forces(conn, row["id"]))
            if not forced and not args.dry_run and (args.game_id or args.requested) \
                    and already_done(conn, row["id"]):
                print(f"[{index}/{len(games)}] {row['opponent']} — ya procesada, salteando (usá --force).")
                if args.requested:
                    clear_request(conn, row["id"])
                    conn.commit()
                continue
            t0 = time.time()
            findings, evaluated = analyze_game(
                row, sf, maia, args.depth,
                args.inhumana_min_cp_loss, args.inhumana_max_cp_loss,
            )
            if evaluated == 0 and not findings:
                print(f"[{index}/{len(games)}] {row['opponent']} — PGN no analizable o sin posiciones tras los filtros.")
            else:
                print(f"[{index}/{len(games)}] {row['opponent']} — {evaluated} posiciones, "
                      f"{len(findings)} hallazgos ({time.time() - t0:.0f}s)")
            all_findings.extend(findings)
            if not args.dry_run:
                # El punto más frágil de la corrida: acá es donde se acumulan los
                # minutos de silencio contra la base mientras corren los motores.
                _, conn = with_reconnect(
                    conn, database_url,
                    lambda c: persist(c, row["id"], findings, evaluated, args.depth,
                                      drop_request=args.requested,
                                      engine=engine, classifier=classifier),
                )
    except KeyboardInterrupt:
        print("\nInterrumpido. Lo analizado hasta acá quedó guardado.", file=sys.stderr)
    finally:
        sf.quit()
        maia.close()

    print(f"\nListo en {(time.time() - started) / 60:.1f} min.")
    print_summary(conn, all_findings, args.dry_run)
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
