"""Tests de la lógica de clasificación y parseo de position_diagnostics.py.

unittest de la stdlib y no pytest a propósito: el repo no tiene tooling de
Python, y esto corre con `python3 -m unittest discover -s scripts` sin instalar
nada. Solo depende de `chess`, que el script ya necesita.

Cubre lo que decide qué se guarda y lo que decide qué se lee de una partida.
Los umbrales son la razón de ser de todo el script — clasificar mal es peor que
no clasificar — y el parser ya perdió partidas enteras en silencio una vez.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import chess
import chess.pgn
import diagnostics as pd

# python-chess loguea cada SAN ilegal que encuentra. El parser los provoca a
# propósito —así detecta que una lectura quedó sucia y reintenta— así que en los
# tests ese ruido es la señal esperada, no un problema.
import logging
logging.getLogger("chess.pgn").setLevel(logging.CRITICAL)


class TestClassify(unittest.TestCase):
    """Prioridad: brecha > inhumana > error propio. None significa no guardar."""

    def test_brecha_needs_both_my_move_and_a_real_loss(self):
        # Jugué la top de Maia y perdí: es el error de la banda.
        self.assertEqual(pd.classify(92, True, 0.20), "brecha_conceptual")
        # La misma jugada sin pérdida real no es una brecha, no es nada.
        self.assertIsNone(pd.classify(10, True, 0.20))
        # Perdí lo mismo pero NO es lo que juega la banda: es mío.
        self.assertEqual(pd.classify(150, False, 0.20), "error_propio")

    def test_brecha_wins_over_inhumana(self):
        """Si jugué lo que juega la banda, eso explica el error mejor que la
        rareza de la jugada del motor, aunque las dos condiciones se cumplan."""
        self.assertEqual(pd.classify(200, True, 0.01), "brecha_conceptual")

    def test_inhumana_is_bounded_at_both_ends(self):
        # Dentro de la banda: la jugada del motor es rara y algo costó.
        self.assertEqual(pd.classify(150, False, 0.01), "jugada_inhumana")
        # Debajo del piso no se perdió nada: es ruido, no un hallazgo.
        self.assertIsNone(pd.classify(9, False, 0.01))
        self.assertIsNone(pd.classify(49, False, 0.01))
        # Encima del techo el desastre es propio por más rara que fuera la
        # jugada correcta. Este era el 54% del corpus antes de acotarla.
        self.assertEqual(pd.classify(678, False, 0.01), "error_propio")

    def test_inhumana_needs_the_engine_move_to_be_actually_rare(self):
        """5% es el umbral: una jugada que la banda encuentra no explica nada."""
        self.assertEqual(pd.classify(150, False, 0.049), "jugada_inhumana")
        self.assertEqual(pd.classify(150, False, 0.05), "error_propio")

    def test_error_propio_starts_at_100(self):
        self.assertIsNone(pd.classify(99, False, 0.50))
        self.assertEqual(pd.classify(100, False, 0.50), "error_propio")

    def test_thresholds_are_overridable(self):
        """El corpus se reclasifica con umbrales distintos sin re-analizar, así
        que los parámetros tienen que mandar sobre los defaults."""
        # Subir el piso saca la fila de "inhumana", pero 150cp sigue siendo un
        # error que vale guardar: cae a error_propio, no desaparece.
        self.assertEqual(
            pd.classify(150, False, 0.01, inhuman_min_cp_loss=200), "error_propio"
        )
        # Subir el techo trae de vuelta pérdidas grandes a "inhumana".
        self.assertEqual(
            pd.classify(400, False, 0.01, inhuman_max_cp_loss=500), "jugada_inhumana"
        )
        # Y un piso alto sí descarta lo que no llega a error propio.
        self.assertIsNone(pd.classify(60, False, 0.01, inhuman_min_cp_loss=200))


class TestParseMoves(unittest.TestCase):
    """En la base conviven dos formatos y uno de ellos rompe python-chess."""

    def test_bare_san_movetext(self):
        """Las partidas de lichess son SAN pelado, sin headers ni números."""
        moves = pd.parse_moves("d4 Nf6 Bf4 c5 e3 g6 c3 Bg7")
        self.assertEqual(len(moves), 8)
        self.assertEqual(moves[0].uci(), "d2d4")

    def test_zero_castling_does_not_silently_truncate(self):
        """python-chess corta la partida en '0-0' SIN lanzar excepción. Es el bug
        que perdía partidas enteras: se detecta por game.errors y se reintenta
        sobre el texto saneado."""
        pgn = '[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. 0-0 d6 *\n'
        moves = pd.parse_moves(pgn)
        self.assertEqual(len(moves), 8, "el enroque con ceros truncó la partida")

    def test_study_comments_variations_and_annotations(self):
        pgn = (
            '[Event "IRT"]\n\n'
            "1. e4 {[%clk 0:59:00]} e5!? 2. Nf3 (2. f4 exf4 3. Nf3) 2... Nc6 $1 3. Bb5 a6\n"
        )
        moves = pd.parse_moves(pgn)
        # Solo la línea principal: la variante no cuenta como jugadas jugadas.
        self.assertEqual([m.uci() for m in moves],
                         ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6"])

    def test_unparseable_input_returns_empty_instead_of_raising(self):
        """Una partida rota no puede tirar abajo una corrida de horas."""
        for bad in (None, "", "   ", "esto no es ajedrez"):
            self.assertEqual(pd.parse_moves(bad), [])

    def test_keeps_the_longest_reading(self):
        """Cuando ninguna pasada queda limpia se elige la que llegó más lejos,
        en vez de quedarse con la primera que falló."""
        moves = pd.parse_moves("e4 e5 Nf3 Nc6 Bb5 a6 jugadaInventada Nf6")
        self.assertEqual(len(moves), 6)


class TestSanitizePgn(unittest.TestCase):
    def test_normalisations(self):
        s = pd.sanitize_pgn("1. e4! {nota} e5?! (1... c5) 2. O-O 0-0-0 $3 1/2 - 1/2")
        self.assertNotIn("{", s)
        self.assertNotIn("(", s)
        self.assertNotIn("!", s)
        self.assertNotIn("$3", s)
        self.assertIn("O-O-O", s)
        self.assertIn("1/2-1/2", s)

    def test_en_dash_castling(self):
        """Algunos exportadores escriben el enroque con guion largo."""
        self.assertIn("O-O-O", pd.sanitize_pgn("0–0–0"))


class TestStructure(unittest.TestCase):
    def test_names_pawn_defects(self):
        # Peones blancos doblados en la columna c, negros sanos.
        board = chess.Board("4k3/pp4pp/8/8/8/2P5/PPP3PP/4K3 w - - 0 1")
        st = pd._structure(board, chess.WHITE)
        self.assertEqual(st["pawns"]["mine"]["doubled"], 1)
        self.assertEqual(st["pawns"]["theirs"]["doubled"], 0)

    def test_isolated_pawn(self):
        board = chess.Board("4k3/8/8/8/8/8/3P4/4K3 w - - 0 1")
        self.assertEqual(pd._structure(board, chess.WHITE)["pawns"]["mine"]["isolated"], 1)

    def test_mobility_is_reported_for_both_sides(self):
        st = pd._structure(chess.Board(), chess.WHITE)
        self.assertEqual(st["mobility"]["mine"], 20)
        self.assertEqual(st["mobility"]["theirs"], 20)


class TestProvenance(unittest.TestCase):
    def test_classifier_id_reflects_the_thresholds_in_use(self):
        """Es lo que permite saber qué filas quedaron viejas cuando cambian."""
        class Args:
            inhumana_min_cp_loss = 50
            inhumana_max_cp_loss = 300
        ident = pd.classifier_id(Args())
        self.assertIn("50", ident)
        self.assertIn("300", ident)
        self.assertIn(str(pd.INHUMAN_POLICY), ident)

    def test_engine_id_degrades_instead_of_raising(self):
        self.assertEqual(pd.engine_id("/no/existe/stockfish"), "desconocido")


class TestMaiaPolicyParsing(unittest.TestCase):
    def test_reads_a_verbose_move_stats_line(self):
        line = ("info string e2e4  (322 ) N:       0 (+0) (P: 44.24%) "
                "(WL:  -.-----) (D: -.---) (M:  -.-) (Q:  0.03373)")
        m = pd._POLICY_RE.match(line)
        self.assertIsNotNone(m)
        self.assertEqual(m.group(1), "e2e4")
        self.assertAlmostEqual(float(m.group(2)) / 100, 0.4424)

    def test_the_node_summary_line_is_not_a_move(self):
        """lc0 cierra con una línea 'node' que matchea igual y no es una jugada."""
        line = "info string node  (  20) N:       1 (+ 0) (P:  0.00%) (WL:  0.03279)"
        m = pd._POLICY_RE.match(line)
        self.assertIsNotNone(m)
        self.assertEqual(m.group(1), "node")


if __name__ == "__main__":
    unittest.main()
