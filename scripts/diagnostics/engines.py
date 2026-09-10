"""Los dos motores: Maia hablada en UCI crudo, y la identidad de Stockfish.

`engine_id` está acá y no en el análisis porque es lo que se guarda con cada
corrida: sin eso, actualizar el motor deja filas viejas y nuevas
indistinguibles.
"""

from __future__ import annotations

import re
import subprocess

import chess

# python-chess no expone bien las líneas `info string` de lc0, que es donde vive
# el desglose de policy, así que se habla UCI crudo. Verificado contra lc0
# 0.32.1: `go nodes 1` con VerboseMoveStats imprime una línea por jugada legal
# más una línea resumen "node" que hay que descartar.
_POLICY_RE = re.compile(
    r"^info string\s+(\S+)\s+\(\s*\d+\s*\)\s+N:.*?\(P:\s*([0-9.]+)%\)"
)


class MaiaEngine:
    """lc0 con pesos de Maia, en modo policy pura (sin búsqueda)."""

    def __init__(self, lc0_path: str, weights: str, policy_temperature: float | None):
        self.proc = subprocess.Popen(
            [lc0_path, f"--weights={weights}"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
        )
        self._send("uci")
        self._read_until("uciok")
        for option in (
            "VerboseMoveStats value true",
            "Threads value 1",
            "MinibatchSize value 1",
            "MaxPrefetch value 0",
            "SmartPruningFactor value 0",
        ):
            self._send(f"setoption name {option}")
        if policy_temperature is not None:
            self._send(f"setoption name PolicyTemperature value {policy_temperature}")
        self._send("isready")
        self._read_until("readyok")

    def _send(self, command: str) -> None:
        assert self.proc.stdin is not None
        self.proc.stdin.write(command + "\n")
        self.proc.stdin.flush()

    def _read_until(self, token: str) -> list[str]:
        assert self.proc.stdout is not None
        lines: list[str] = []
        while True:
            line = self.proc.stdout.readline()
            if not line:
                raise RuntimeError(f"lc0 murió esperando '{token}'")
            lines.append(line.rstrip("\n"))
            if line.startswith(token):
                return lines

    def policy(self, board: chess.Board) -> dict[str, float]:
        """{uci: probabilidad 0..1} para cada jugada legal, sin búsqueda."""
        self._send(f"position fen {board.fen()}")
        self._send("go nodes 1")
        out = self._read_until("bestmove")
        policies: dict[str, float] = {}
        for line in out:
            match = _POLICY_RE.match(line)
            if not match:
                continue
            move, percent = match.group(1), match.group(2)
            if move == "node":  # línea resumen de la raíz, no es una jugada
                continue
            policies[move] = float(percent) / 100.0
        if not policies:
            raise RuntimeError(f"lc0 no devolvió policy para {board.fen()}")
        return policies

    def close(self) -> None:
        try:
            self._send("quit")
            self.proc.wait(timeout=5)
        except Exception:
            self.proc.kill()



def engine_id(path: str) -> str:
    """Primera línea del banner UCI, ej. "Stockfish 19".

    Se guarda con cada corrida: sin esto, actualizar el motor deja filas viejas y
    nuevas indistinguibles, y las evaluaciones de dos versiones no son
    comparables entre sí.
    """
    try:
        out = subprocess.run([path], input="uci\nquit\n", capture_output=True,
                             text=True, timeout=30).stdout
        for line in out.splitlines():
            if line.strip() and not line.startswith("info"):
                return line.strip()[:80]
    except (subprocess.SubprocessError, OSError):
        pass
    return "desconocido"
