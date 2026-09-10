"""Qué se lee de `games`, qué se escribe en `position_diagnostics`, y el resumen.

Las migraciones se aplican a mano, así que las tablas pueden no estar todavía;
`tables_exist` es lo que evita que eso se manifieste como un error de SQL.
"""

from __future__ import annotations

import psycopg2.extras

from diagnostics.analysis import Finding


def tables_exist(conn, *, needs_queue: bool = False) -> bool:
    """Las migraciones se aplican a mano, así que pueden no estar todavía."""
    needed = ["position_diagnostics", "position_diagnostics_runs"]
    if needs_queue:
        needed.append("position_diagnostics_requests")
    with conn.cursor() as cur:
        for table in needed:
            cur.execute("SELECT to_regclass(%s)", (f"public.{table}",))
            if cur.fetchone()[0] is None:
                return False
    return True


def fetch_games(conn, args, has_tables: bool) -> list[dict]:
    where = ["pgn IS NOT NULL", "length(pgn) > 60"]
    params: list = []
    if args.game_id:
        where.append("id = %s")
        params.append(args.game_id)
    if args.source:
        where.append("source = %s")
        params.append(args.source)
    if args.requested:
        # La cola manda: si la app la pidió, se analiza aunque ya esté hecha.
        # El pedido lleva su propio flag de re-análisis (ver migración 002).
        where.append("id IN (SELECT game_id FROM position_diagnostics_requests)")
    elif not args.force and not args.game_id and has_tables:
        where.append("id NOT IN (SELECT game_id FROM position_diagnostics_runs)")
    sql = f"""
        SELECT id::text AS id, source, color, opponent, opponent_elo, tournament,
               played_date, pgn
          FROM games
         WHERE {' AND '.join(where)}
         ORDER BY {'(SELECT requested_at FROM position_diagnostics_requests r WHERE r.game_id = games.id)'
                   if args.requested else "(source = 'otb') DESC, played_date DESC NULLS LAST"}
    """
    if args.limit:
        sql += " LIMIT %s"
        params.append(args.limit)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def request_forces(conn, game_id: str) -> bool:
    """Un pedido con force=true re-analiza una partida ya hecha."""
    with conn.cursor() as cur:
        cur.execute("SELECT force FROM position_diagnostics_requests WHERE game_id = %s", (game_id,))
        row = cur.fetchone()
        return bool(row and row[0])


def clear_request(conn, game_id: str) -> None:
    """El pedido se borra recién después de guardar, en la misma transacción."""
    with conn.cursor() as cur:
        cur.execute("DELETE FROM position_diagnostics_requests WHERE game_id = %s", (game_id,))


def already_done(conn, game_id: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM position_diagnostics_runs WHERE game_id = %s", (game_id,))
        return cur.fetchone() is not None


def persist(conn, game_id: str, findings: list[Finding], evaluated: int, depth: int,
            drop_request: bool = False, engine: str = "", classifier: str = "") -> None:
    """Una transacción por partida: cortar con Ctrl-C no pierde lo ya analizado."""
    with conn.cursor() as cur:
        cur.execute("DELETE FROM position_diagnostics WHERE game_id = %s", (game_id,))
        for f in findings:
            cur.execute(
                """
                INSERT INTO position_diagnostics
                  (game_id, ply, fen, move_played, cp_loss, sf_top3, maia_top_move,
                   maia_policy_played, maia_policy_sf_top, category)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    f.game_id, f.ply, f.fen, f.move_played, f.cp_loss,
                    psycopg2.extras.Json(f.sf_top3), f.maia_top_move,
                    f.maia_policy_played, f.maia_policy_sf_top, f.category,
                ),
            )
        cur.execute(
            """
            INSERT INTO position_diagnostics_runs
              (game_id, depth, positions, findings, engine, classifier)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (game_id) DO UPDATE
               SET analyzed_at = now(), depth = EXCLUDED.depth,
                   positions = EXCLUDED.positions, findings = EXCLUDED.findings,
                   engine = EXCLUDED.engine, classifier = EXCLUDED.classifier
            """,
            (game_id, depth, evaluated, len(findings), engine, classifier),
        )
        if drop_request:
            cur.execute("DELETE FROM position_diagnostics_requests WHERE game_id = %s", (game_id,))
    conn.commit()


# --- Resumen ----------------------------------------------------------------

def _summary_from_memory(findings: list[Finding]) -> tuple[dict[str, int], list[dict]]:
    counts: dict[str, int] = {}
    for f in findings:
        counts[f.category] = counts.get(f.category, 0) + 1
    brechas = sorted(
        (f for f in findings if f.category == "brecha_conceptual"),
        key=lambda f: -f.cp_loss,
    )[:10]
    return counts, [
        {
            "opponent": f.opponent, "tournament": f.tournament, "played_date": f.played_date,
            "fullmove": f.fullmove, "move_played": f.move_played,
            "sf_best": f.sf_best_san, "cp_loss": f.cp_loss,
        }
        for f in brechas
    ]


def _summary_from_db(conn) -> tuple[dict[str, int], list[dict]]:
    """Sobre TODO lo acumulado, no solo esta tanda: con --limit el corpus se hace
    de a partes y el top 10 que interesa es el del corpus entero."""
    with conn.cursor() as cur:
        cur.execute("SELECT category, count(*) FROM position_diagnostics GROUP BY category")
        counts = {row[0]: row[1] for row in cur.fetchall()}
        cur.execute(
            """
            SELECT g.opponent, g.tournament, g.played_date,
                   (d.ply + 1) / 2 AS fullmove, d.move_played,
                   d.sf_top3 -> 0 ->> 'move_san' AS sf_best, d.cp_loss
              FROM position_diagnostics d
              JOIN games g ON g.id = d.game_id
             WHERE d.category = 'brecha_conceptual'
             ORDER BY d.cp_loss DESC
             LIMIT 10
            """
        )
        keys = ("opponent", "tournament", "played_date", "fullmove", "move_played", "sf_best", "cp_loss")
        return counts, [dict(zip(keys, row)) for row in cur.fetchall()]


def print_summary(conn, findings: list[Finding], dry_run: bool) -> None:
    if dry_run:
        counts, brechas = _summary_from_memory(findings)
        scope = "en esta corrida (dry-run, nada se guardó)"
    else:
        counts, brechas = _summary_from_db(conn)
        scope = "acumuladas en position_diagnostics"

    print()
    print(f"## Divergencias por categoría — {scope}")
    print()
    for category in ("brecha_conceptual", "jugada_inhumana", "error_propio"):
        print(f"- **{category}**: {counts.get(category, 0)}")

    print()
    print("## Top 10 brechas conceptuales (jugué lo que juega un 1900, y estaba mal)")
    print()
    if not brechas:
        print("_Sin brechas conceptuales todavía._")
        return
    print("| Partida | Jugada | Jugué | Stockfish | Pérdida |")
    print("| --- | --- | --- | --- | --- |")
    for b in brechas:
        date = b["played_date"].isoformat() if b["played_date"] else "s/f"
        label = f"{b['opponent']} ({b['tournament'] or 'sin torneo'}, {date})"
        print(f"| {label} | {b['fullmove']} | {b['move_played']} | {b['sf_best']} | {b['cp_loss']}cp |")

