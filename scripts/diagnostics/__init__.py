"""Diagnóstico de posiciones: las piezas que usa scripts/position_diagnostics.py.

El entrypoint sigue siendo `scripts/position_diagnostics.py` — la ruta aparece
en las migraciones, en .env.example y en el copy de la app, así que no se mueve.
Acá viven las partes, y este módulo es la superficie pública del paquete.

Los submódulos importan entre sí por su nombre completo (`diagnostics.rules`),
nunca de este archivo: así no hay ciclos.
"""

from __future__ import annotations

# Las reglas: qué es un hallazgo y con qué umbrales se decidió.
from diagnostics.rules import (
    BRECHA_MIN_CP_LOSS,
    CP_LOSS_CAP,
    DEFAULT_DEPTH,
    ERROR_PROPIO_MIN_CP_LOSS,
    EVAL_CEILING_CP,
    FIRST_FULLMOVE,
    INHUMAN_MAX_CP_LOSS,
    INHUMAN_MIN_CP_LOSS,
    INHUMAN_POLICY,
    MAIA_RATINGS,
    MATE_SCORE,
    MULTIPV,
    PV_PLIES,
    classify,
    classifier_id,
)
# Entorno y conexión.
from diagnostics.config import (
    REPO_ROOT,
    connect,
    env_from_dotenv,
    load_api_keys,
    load_database_url,
    with_reconnect,
)
# Motores. _POLICY_RE es privado pero está testeado: parsear mal esa línea es
# leer mal la policy de Maia, que es la mitad del diagnóstico.
from diagnostics.engines import MaiaEngine, _POLICY_RE, engine_id
from diagnostics.pgn import parse_moves, sanitize_pgn
from diagnostics.analysis import Finding, analyze_game
from diagnostics.store import (
    already_done,
    clear_request,
    fetch_games,
    persist,
    print_summary,
    request_forces,
    tables_exist,
)
# Las pasadas. _structure también es privado y también está testeado.
from diagnostics.evidence import EVIDENCE_DEPTH, _structure, run_evidence
from diagnostics.explain import (
    EXPLAIN_EFFORT,
    EXPLAIN_MODEL,
    XAI_MODEL,
    run_explain,
    run_patterns,
)
from diagnostics.maia_passes import run_drills_policy, run_ladder
from diagnostics.traps import run_traps
