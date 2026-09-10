"""Dar vuelta el análisis: dónde el RIVAL podía equivocarse.

En vez de mirar mis jugadas, mira las posiciones donde movía el rival y
pregunta si lo que un humano de esa banda juega por instinto está mal. Sirve
para preparación: son las posiciones a las que conviene llevar la partida.
"""

from __future__ import annotations

import sys

import chess
import chess.engine
import psycopg2.extras

from diagnostics.config import load_database_url, with_reconnect
from diagnostics.engines import MaiaEngine, engine_id
from diagnostics.pgn import parse_moves
from diagnostics.rules import FIRST_FULLMOVE, MATE_SCORE


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

