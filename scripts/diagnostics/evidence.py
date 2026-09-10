"""Reconstruir el POR QUÉ de un hallazgo ya guardado.

Pasada aparte del análisis principal por dos razones: usa una profundidad mucho
menor, y se puede recalcular cuando cambie la forma de la evidencia sin
re-correr Stockfish a profundidad completa sobre todo el corpus.
"""

from __future__ import annotations

import re
import subprocess
import sys

import chess
import chess.engine
import psycopg2.extras

from diagnostics.config import load_database_url, with_reconnect
from diagnostics.engines import engine_id
from diagnostics.pgn import parse_moves
from diagnostics.rules import MATE_SCORE, PV_PLIES

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

