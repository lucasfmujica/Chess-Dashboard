"""Las dos pasadas que solo necesitan Maia, sobre filas ya guardadas.

Maia con búsqueda nula es una pasada por la red, no una búsqueda: correrla de
nuevo cuesta centésimas. Por eso estas dos no son parte del análisis principal
—se pueden recalcular sin volver a pagar Stockfish— y viven juntas.
"""

from __future__ import annotations

import sys
from pathlib import Path

import chess
import psycopg2.extras

from diagnostics.engines import MaiaEngine
from diagnostics.rules import MAIA_RATINGS


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

