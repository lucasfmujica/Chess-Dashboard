"""De dónde salen la URL de la base y las claves, y cómo se sobrevive a Neon.

El repo no usa dotenv: los scripts Node leen .env.local con
`node --env-file=.env.local`, así que acá se parsea a mano.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2

# parents[2] y no parent.parent: este módulo vive un nivel más adentro que el
# entrypoint (scripts/diagnostics/config.py), así que hay que subir tres.
REPO_ROOT = Path(__file__).resolve().parents[2]


def connect(url: str):
    """Conexión a Neon con keepalives.

    Sin esto la corrida larga se muere: entre partida y partida pasan minutos de
    CPU sin tocar la base, Neon cierra la conexión ociosa, y el commit siguiente
    revienta con "SSL connection has been closed unexpectedly". Los keepalives
    hacen que el socket siga dando señales de vida durante esos huecos.
    """
    return psycopg2.connect(
        url,
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )


def with_reconnect(conn, url: str, operation):
    """Corre `operation(conn)` y, si la conexión murió, reconecta y reintenta.

    Los keepalives reducen el problema pero no lo eliminan: Neon puede cerrar
    igual, y una corrida de horas no puede perderse por eso. Reintenta una sola
    vez — si la segunda también falla, el problema no es la conexión ociosa.
    """
    try:
        return operation(conn), conn
    except (psycopg2.OperationalError, psycopg2.InterfaceError) as err:
        print(f"  conexión perdida ({err.__class__.__name__}), reconectando...", file=sys.stderr)
        try:
            conn.close()
        except Exception:
            pass
        fresh = connect(url)
        return operation(fresh), fresh


def env_from_dotenv(name: str) -> str | None:
    """Lee una variable de .env.local. El repo no usa dotenv: los scripts Node
    leen ese archivo con `node --env-file=.env.local`."""
    env_local = REPO_ROOT / ".env.local"
    if not env_local.is_file():
        return None
    for raw in env_local.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        if key.strip() != name:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if value:
            return value
    return None


def load_api_keys() -> None:
    """Mete en el entorno las claves de los narradores, si están en .env.local.
    Los SDKs las leen de ahí, no reciben la clave por parámetro."""
    for name in ("ANTHROPIC_API_KEY", "XAI_API_KEY"):
        if not os.environ.get(name):
            value = env_from_dotenv(name)
            if value:
                os.environ[name] = value


def load_database_url() -> str:
    """DATABASE_URL del entorno; si no está, del .env.local gitignoreado."""
    url = os.environ.get("DATABASE_URL") or env_from_dotenv("DATABASE_URL")
    if url:
        return url
    sys.exit(
        "DATABASE_URL is not set. Run with: DATABASE_URL=... python3 "
        "scripts/position_diagnostics.py, or leave it in .env.local"
    )

