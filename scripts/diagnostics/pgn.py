"""Leer las jugadas de un PGN que puede venir en dos formatos y estar sucio."""

from __future__ import annotations

import io
import re

import chess
import chess.pgn

# En la DB conviven dos formatos: las OTB traen PGN completo con headers,
# comentarios de estudio de Lichess y variantes, y las de lichess son movetext
# SAN pelado, sin números de jugada. python-chess maneja los dos, pero un
# enroque escrito "0-0" en vez de "O-O" le TRUNCA la partida en silencio, así
# que si la primera pasada deja errores se reintenta sobre el texto normalizado.
# Es el mismo saneo que hace sanitizePgn() en src/hooks/useGameReplay.ts.

_TERMINATION = {"1-0", "0-1", "1/2-1/2", "*"}


def sanitize_pgn(pgn: str) -> str:
    text = re.sub(r"\{[^}]*\}", " ", pgn)
    text = re.sub(r";[^\n]*", " ", text)
    text = re.sub(r"\$\d+", " ", text)
    while True:  # variantes, de la más interna hacia afuera
        stripped = re.sub(r"\([^()]*\)", " ", text)
        if stripped == text:
            break
        text = stripped
    text = re.sub(r"0[-\u2013\u2014]0[-\u2013\u2014]0", "O-O-O", text)
    text = re.sub(r"0[-\u2013\u2014]0", "O-O", text)
    text = re.sub(r"[!?]", "", text)
    text = re.sub(r"1\s*/\s*2\s*[-\u2013\u2014]\s*1\s*/\s*2", "1/2-1/2", text)
    text = re.sub(r"(^|\s)1\s*[-\u2013\u2014]\s*0(\s|$)", r"\g<1>1-0\g<2>", text)
    text = re.sub(r"(^|\s)0\s*[-\u2013\u2014]\s*1(\s|$)", r"\g<1>0-1\g<2>", text)
    return re.sub(r"[ \t]+", " ", text)


def _read_mainline(text: str) -> tuple[list[chess.Move], bool]:
    game = chess.pgn.read_game(io.StringIO(text))
    if game is None:
        return [], False
    return list(game.mainline_moves()), not game.errors


def _push_tokens(text: str) -> list[chess.Move]:
    """Último recurso: empujar tokens SAN uno por uno, ignorando la basura."""
    movetext = "\n".join(
        line for line in text.splitlines() if not line.lstrip().startswith("[")
    )
    board = chess.Board()
    moves: list[chess.Move] = []
    for token in movetext.split():
        token = token.strip()
        if not token or token in _TERMINATION or re.fullmatch(r"\d+\.*", token):
            continue
        token = re.sub(r"^\d+\.+", "", token)
        if not token:
            continue
        try:
            move = board.parse_san(token)
        except (ValueError, AssertionError):
            break  # a partir de acá la línea deja de ser confiable
        board.push(move)
        moves.append(move)
    return moves


def parse_moves(pgn: str | None) -> list[chess.Move]:
    if not pgn or not pgn.strip():
        return []
    moves, clean = _read_mainline(pgn)
    if clean and moves:
        return moves
    sanitized = sanitize_pgn(pgn)
    retry, clean_retry = _read_mainline(sanitized)
    if clean_retry and retry:
        return retry
    fallback = _push_tokens(sanitized)
    # Quedarse con la lectura más larga: cualquiera puede haberse cortado antes.
    return max([moves, retry, fallback], key=len)

