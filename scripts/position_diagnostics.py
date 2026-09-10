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
from diagnostics.evidence import EVIDENCE_DEPTH, run_evidence
from diagnostics.explain import (
    EXPLAIN_EFFORT, EXPLAIN_MODEL, XAI_MODEL, run_explain, run_patterns,
)
# _structure: andamio para el test, igual que _POLICY_RE. Se va en el paso final.
from diagnostics.evidence import _structure  # noqa: F401
# _POLICY_RE: andamio para que el test lo siga viendo por acá. Se va en el
# paso final, cuando el test pase a importar el paquete.
from diagnostics.engines import _POLICY_RE  # noqa: F401
from diagnostics.maia_passes import run_drills_policy, run_ladder
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
from diagnostics.traps import run_traps
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
