"""Los umbrales que deciden qué es un hallazgo, y la clasificación que los usa.

Clasificar mal es peor que no clasificar: los números de acá son la razón de ser
del script, y cada uno lleva anotado por qué vale lo que vale. `classify` vive
al lado de ellos porque no hace más que compararlos.
"""

from __future__ import annotations

# Se saltean las primeras 8 jugadas completas: antes de la 9 casi todo es
# teoría o repertorio, no decisiones mías.
FIRST_FULLMOVE = 9
# Posiciones ya decididas: si la mejor jugada deja la evaluación fuera de +-400,
# la diferencia entre la 1ra y la 3ra opción deja de ser instructiva.
EVAL_CEILING_CP = 400
BRECHA_MIN_CP_LOSS = 50
ERROR_PROPIO_MIN_CP_LOSS = 100
# Debajo de esta policy, la jugada de Stockfish está fuera del radar humano.
INHUMAN_POLICY = 0.05
# Piso de pérdida para jugada_inhumana. 0 es la regla tal como se pidió: alcanza
# con que la jugada de Stockfish sea rara para Maia, sin importar cuánto perdí.
# En la práctica eso marca posiciones donde mi jugada era casi igual de buena
# (se vieron divergencias de 9cp entrando en la categoría), que es ruido.
# Subirlo a ~50 deja solo las que además costaron algo. Se ajusta por CLI.
INHUMAN_MIN_CP_LOSS = 50
# Techo de jugada_inhumana. Sin él la categoría se queda con errores grandes que
# son claramente propios: sobre las 271 divergencias de las 51 OTB se llevaba 146
# (el 54%), mezclando divergencias de 0cp con desastres de 678cp. Con piso 50 y
# techo 300 el reparto queda 56 brechas, 85 errores propios y 35 inhumanas.
INHUMAN_MAX_CP_LOSS = 300
# Mate convertido a centipeones: deliberadamente enorme para que todo mate caiga
# solo por el filtro EVAL_CEILING_CP, sin necesitar un caso especial.
MATE_SCORE = 100_000
# Tope de cp_loss. Cuando la jugada jugada permite mate, la resta contra
# MATE_SCORE da números como 99609, que no son una pérdida: son la codificación
# del mate. Y pasados unos 20 peones la diferencia deja de significar algo — la
# posición está perdida igual. Acotarlo mantiene legibles los promedios y la UI
# sin perder el hallazgo, que igual queda como error_propio.
CP_LOSS_CAP = 2000

DEFAULT_DEPTH = 20
MULTIPV = 3
# Plies de la variante que se guardan por candidata. "Bf5 era mejor" no enseña
# nada; "Bf5 y si Bxf5 gxf5, el peón de b7 cae" sí. Cuatro jugadas alcanzan para
# ver la idea sin guardar una línea que ya no se sostiene.
PV_PLIES = 8
# Los nueve modelos de Maia. Correrlos todos sobre una posición ya analizada
# cuesta centésimas: con búsqueda nula es una pasada por la red, no una búsqueda.
# Son ratings de LICHESS: 1900 acá es ~1750-1800 FIDE, el techo de la escalera.
MAIA_RATINGS = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900]


def classify(
    cp_loss: int,
    played_is_maia_top: bool,
    policy_sf_top: float,
    inhuman_min_cp_loss: int = INHUMAN_MIN_CP_LOSS,
    inhuman_max_cp_loss: int = INHUMAN_MAX_CP_LOSS,
) -> str | None:
    """Prioridad: brecha > inhumana > error propio. None = no se guarda."""
    if played_is_maia_top and cp_loss >= BRECHA_MIN_CP_LOSS:
        return "brecha_conceptual"
    # La rareza de la jugada del motor solo explica el error dentro de una banda:
    # por debajo del piso no perdiste nada, y por encima del techo el desastre es
    # tuyo por más raro que fuera lo que había que encontrar.
    if (policy_sf_top < INHUMAN_POLICY
            and inhuman_min_cp_loss <= cp_loss <= inhuman_max_cp_loss):
        return "jugada_inhumana"
    if cp_loss >= ERROR_PROPIO_MIN_CP_LOSS:
        return "error_propio"
    return None


def classifier_id(args) -> str:
    """Los umbrales con los que se clasificó, para saber qué quedó viejo."""
    return (f"brecha>={BRECHA_MIN_CP_LOSS}/inhumana{args.inhumana_min_cp_loss}-"
            f"{args.inhumana_max_cp_loss}@{INHUMAN_POLICY}/propio>={ERROR_PROPIO_MIN_CP_LOSS}")
