"""La pasada principal: cruzar Stockfish contra Maia en cada posición mía.

Lo que sale de acá es un `Finding` por divergencia que la clasificación
consideró digna de guardar. La decisión de qué se guarda vive en `rules`.
"""

from __future__ import annotations

from dataclasses import dataclass

import chess
import chess.engine

from diagnostics.engines import MaiaEngine
from diagnostics.pgn import parse_moves
from diagnostics.rules import (
    CP_LOSS_CAP, EVAL_CEILING_CP, FIRST_FULLMOVE, INHUMAN_MAX_CP_LOSS,
    INHUMAN_MIN_CP_LOSS, MATE_SCORE, MULTIPV, PV_PLIES, classify,
)

@dataclass
class Finding:
    game_id: str
    ply: int
    fullmove: int
    fen: str
    move_played: str
    cp_loss: int
    sf_top3: list[dict]
    maia_top_move: str
    maia_policy_played: float
    maia_policy_sf_top: float
    category: str
    # Solo para el resumen en consola, no van a la tabla.
    opponent: str = ""
    tournament: str | None = None
    played_date: object = None

    @property
    def sf_best_san(self) -> str:
        return self.sf_top3[0]["move_san"]


def _pv_san(board: chess.Board, pv: list[chess.Move]) -> str:
    """La variante en SAN con numeración, ej. "9...Bf5 10.Bxf5 gxf5"."""
    try:
        return board.variation_san(pv[:PV_PLIES])
    except (ValueError, AssertionError):
        return ""


def _eval_cp(info: dict, my_color: chess.Color) -> int:
    """Centipeones desde MI perspectiva, con el mate saturado a MATE_SCORE."""
    return info["score"].pov(my_color).score(mate_score=MATE_SCORE)


def analyze_game(
    row: dict,
    sf: chess.engine.SimpleEngine,
    maia: MaiaEngine,
    depth: int,
    inhuman_min_cp_loss: int = INHUMAN_MIN_CP_LOSS,
    inhuman_max_cp_loss: int = INHUMAN_MAX_CP_LOSS,
) -> tuple[list[Finding], int]:
    """Devuelve (hallazgos, posiciones evaluadas con Stockfish)."""
    moves = parse_moves(row["pgn"])
    if not moves:
        return [], 0

    my_color = chess.WHITE if row["color"] == "W" else chess.BLACK
    limit = chess.engine.Limit(depth=depth)
    board = chess.Board()
    findings: list[Finding] = []
    evaluated = 0

    for played in moves:
        # Los filtros van de más barato a más caro: todo lo que se pueda
        # descartar antes de llamar a Stockfish, se descarta antes.
        if board.turn != my_color or board.fullmove_number < FIRST_FULLMOVE:
            board.push(played)
            continue

        fen = board.fen()
        ply = board.ply() + 1  # 1-based, igual que blunder_drills
        fullmove = board.fullmove_number
        played_san = board.san(played)

        infos = sf.analyse(board, limit, multipv=MULTIPV)
        evaluated += 1
        top3 = [
            {
                "rank": rank,
                "move_san": board.san(info["pv"][0]),
                "move_uci": info["pv"][0].uci(),
                "eval_cp": _eval_cp(info, my_color),
                "line": _pv_san(board, info["pv"]),
            }
            for rank, info in enumerate(infos, start=1)
            if info.get("pv")
        ]
        if not top3:
            board.push(played)
            continue

        best_eval = top3[0]["eval_cp"]
        # Posición ya decidida, o jugué la mejor: no hay divergencia que mirar.
        if abs(best_eval) > EVAL_CEILING_CP or top3[0]["move_uci"] == played.uci():
            board.push(played)
            continue

        # Eval de mi jugada: gratis si quedó entre las top 3, si no una búsqueda
        # más restringida a esa jugada. Mismo FEN y misma perspectiva, así que no
        # hay que negar nada.
        played_entry = next((m for m in top3 if m["move_uci"] == played.uci()), None)
        if played_entry is not None:
            played_eval = played_entry["eval_cp"]
        else:
            played_info = sf.analyse(board, limit, root_moves=[played])
            played_eval = _eval_cp(played_info, my_color)
        cp_loss = min(CP_LOSS_CAP, max(0, best_eval - played_eval))

        policies = maia.policy(board)
        maia_top_uci = max(policies, key=policies.__getitem__)
        for candidate in top3:
            candidate["maia_policy"] = policies.get(candidate["move_uci"], 0.0)
        category = classify(
            cp_loss,
            played_is_maia_top=(maia_top_uci == played.uci()),
            policy_sf_top=policies.get(top3[0]["move_uci"], 0.0),
            inhuman_min_cp_loss=inhuman_min_cp_loss,
            inhuman_max_cp_loss=inhuman_max_cp_loss,
        )
        if category is not None:
            findings.append(
                Finding(
                    game_id=row["id"],
                    ply=ply,
                    fullmove=fullmove,
                    fen=fen,
                    move_played=played_san,
                    cp_loss=cp_loss,
                    sf_top3=top3,
                    maia_top_move=board.san(chess.Move.from_uci(maia_top_uci)),
                    maia_policy_played=policies.get(played.uci(), 0.0),
                    maia_policy_sf_top=policies.get(top3[0]["move_uci"], 0.0),
                    category=category,
                    opponent=row["opponent"],
                    tournament=row["tournament"],
                    played_date=row["played_date"],
                )
            )
        board.push(played)

    return findings, evaluated
