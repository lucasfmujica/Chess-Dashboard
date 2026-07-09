/**
 * Initial games data
 * Games ordered chronologically by tournament
 */
import type { Game, PlayerInfo, OpeningCard } from '../types/chess';

export const initialGames: Game[] = [
  // IRT Damian Reca (games 1-7) - Ends at 1727
  { elo: 1651, color: 'W', result: 'W', opp: 'Marcelo Prieto', opp_elo: 1902, eco: 'A25', tournament: 'IRT Damian Reca', rated: true, time: '19:00', source: 'otb', eloChange: 32, kFactor: 40 },
  { elo: 1651, color: 'B', result: 'W', opp: 'Vanesa Guzman', opp_elo: 1756, eco: 'B30', tournament: 'IRT Damian Reca', rated: true, time: '19:00', source: 'otb', eloChange: 26, kFactor: 40 },
  { elo: 1651, color: 'W', result: 'D', opp: 'Exequiel Medina', opp_elo: 1858, eco: 'A15', tournament: 'IRT Damian Reca', rated: true, time: '19:00', source: 'otb', eloChange: 11, kFactor: 40 },
  { elo: 1651, color: 'B', result: 'L', opp: 'Joaquin Rueda', opp_elo: 1996, eco: 'B26', tournament: 'IRT Damian Reca', rated: true, time: '19:00', source: 'otb', eloChange: -4, kFactor: 40 },
  { elo: 1651, color: 'W', result: 'L', opp: 'Walter Montero', opp_elo: 1884, eco: 'A20', tournament: 'IRT Damian Reca', rated: true, time: '19:00', source: 'otb', eloChange: -8, kFactor: 40 },
  { elo: 1651, color: 'W', result: 'W', opp: 'Maximiliano Lalli', opp_elo: 1691, eco: 'A37', tournament: 'IRT Damian Reca', rated: true, time: '19:00', source: 'otb', eloChange: 19, kFactor: 40 },
  { elo: 1651, color: 'B', result: 'D', opp: 'Ezequiel Paredes', opp_elo: 0, eco: 'B32', tournament: 'IRT Damian Reca', rated: true, time: '19:00', source: 'otb', eloChange: 0, kFactor: 40 },

  // Torre Blanca (games 8-12) - Ends at 1776
  { elo: 1727, color: 'W', result: 'L', opp: 'Raul Adrian Habiaga', opp_elo: 1984, eco: 'A29', tournament: 'Torre Blanca', rated: true, time: '19:00', source: 'otb', eloChange: -5, kFactor: 40 },
  { elo: 1727, color: 'B', result: 'W', opp: 'Daniel Federico', opp_elo: 0, eco: 'B20', tournament: 'Torre Blanca', rated: true, time: '19:00', source: 'otb', eloChange: 0, kFactor: 40 },
  { elo: 1727, color: 'B', result: 'D', opp: 'Marcelo Maucci', opp_elo: 1768, eco: 'B37', tournament: 'Torre Blanca', rated: true, time: '19:00', source: 'otb', eloChange: 6, kFactor: 40 },
  { elo: 1727, color: 'W', result: 'W', opp: 'German Cisneros', opp_elo: 1914, eco: 'A15', tournament: 'Torre Blanca', rated: true, time: '19:00', source: 'otb', eloChange: 33, kFactor: 40 },
  { elo: 1727, color: 'W', result: 'D', opp: 'Dario Moreno', opp_elo: 1910, eco: 'A15', tournament: 'Torre Blanca', rated: true, time: '19:00', source: 'otb', eloChange: 15, kFactor: 40 },

  // Club Zugzwang (unrated)
  { elo: 1651, color: 'B', result: 'W', opp: 'Maria Paula Arias', opp_elo: 1736, eco: 'A70', tournament: 'Club Zugzwang', rated: false, source: 'otb' },
  { elo: 1651, color: 'W', result: 'L', opp: 'Anibal Borras', opp_elo: 1731, eco: 'A15', tournament: 'Club Zugzwang', rated: false, source: 'otb' },
  { elo: 1651, color: 'W', result: 'W', opp: 'Gabriel Izak', opp_elo: 2046, eco: 'A13', tournament: 'Club Zugzwang', rated: false, source: 'otb' },
  { elo: 1651, color: 'B', result: 'W', opp: 'Jesuan Letizia', opp_elo: 1486, eco: 'A45', tournament: 'Club Zugzwang', rated: false, source: 'otb' },
  { elo: 1651, color: 'B', result: 'L', opp: 'Hugo Massenzana', opp_elo: 2025, eco: 'A46', tournament: 'Club Zugzwang', rated: false, source: 'otb' },
  { elo: 1651, color: 'W', result: 'W', opp: 'Juan Vilches', opp_elo: 1854, eco: 'A14', tournament: 'Club Zugzwang', rated: false, source: 'otb' },

  // Masters Ciudad (games 13-21) - Ends at 1848
  { elo: 1776, color: 'W', result: 'D', opp: 'Agustín Meza Astrada', opp_elo: 2077, eco: 'A13', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: 14, kFactor: 40 },
  { elo: 1776, color: 'B', result: 'L', opp: 'Hernan Gastiaburo', opp_elo: 2239, eco: 'E91', tournament: 'Masters Ciudad', rated: true, time: '10:00', source: 'otb', eloChange: -3, kFactor: 40 },
  { elo: 1776, color: 'W', result: 'W', opp: 'Jorge Guelman', opp_elo: 1576, eco: 'A15', tournament: 'Masters Ciudad', rated: true, time: '17:00', source: 'otb', eloChange: 10, kFactor: 40 },
  { elo: 1776, color: 'B', result: 'L', opp: 'Federico Naspleda', opp_elo: 2052, eco: 'B31', tournament: 'Masters Ciudad', rated: true, time: '10:00', source: 'otb', eloChange: -7, kFactor: 40 },
  { elo: 1776, color: 'W', result: 'W', opp: 'Isaac Lainez Reyes', opp_elo: 1890, eco: 'A30', tournament: 'Masters Ciudad', rated: true, time: '17:00', source: 'otb', eloChange: 26, kFactor: 40 },
  { elo: 1776, color: 'B', result: 'L', opp: 'Facundo Simbler', opp_elo: 1903, eco: 'B35', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: -13, kFactor: 40 },
  { elo: 1776, color: 'W', result: 'W', opp: 'Thomas Castillo', opp_elo: 1997, eco: 'A10', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: 31, kFactor: 40 },
  { elo: 1776, color: 'B', result: 'L', opp: 'José Zamudio', opp_elo: 1921, eco: 'B21', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: -12, kFactor: 40 },
  { elo: 1776, color: 'W', result: 'W', opp: 'Enzo Alvarez', opp_elo: 1899, eco: 'A29', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: 26, kFactor: 40 },

  // Abierto Madryn (games 22-27) - Ends at 1889
  { elo: 1848, color: 'B', result: 'W', opp: 'Carlos Gonzalez', opp_elo: 1405, eco: 'B23', tournament: 'Abierto Madryn', rated: true, time: '19:00', source: 'otb', eloChange: 3, kFactor: 40 },
  { elo: 1848, color: 'W', result: 'D', opp: 'Marzo Daniel Lucero', opp_elo: 2051, eco: 'A15', tournament: 'Abierto Madryn', rated: true, time: '14:00', source: 'otb', eloChange: 10, kFactor: 40 },
  { elo: 1848, color: 'B', result: 'D', opp: 'Teo Dante Cicciari', opp_elo: 1972, eco: 'A05', tournament: 'Abierto Madryn', rated: true, time: '18:00', source: 'otb', eloChange: 7, kFactor: 40 },
  { elo: 1848, color: 'W', result: 'W', opp: 'Jeremías De Los Santos', opp_elo: 1791, eco: 'A20', tournament: 'Abierto Madryn', rated: true, time: '14:00', source: 'otb', eloChange: 16, kFactor: 40 },
  { elo: 1848, color: 'B', result: 'L', opp: 'Martin Daneri', opp_elo: 2011, eco: 'B23', tournament: 'Abierto Madryn', rated: true, time: '18:00', source: 'otb', eloChange: -13, kFactor: 40 },
  { elo: 1848, color: 'W', result: 'W', opp: 'Sergio Alonso', opp_elo: 1754, eco: 'A20', tournament: 'Abierto Madryn', rated: true, time: '10:00', source: 'otb', eloChange: 18, kFactor: 40 },

  // Abierto Lago Puelo (games 28-34) - Ends at 1861
  { elo: 1889, color: 'B', result: 'W', opp: 'Pablo Rugiero', opp_elo: 1584, eco: 'A76', tournament: 'Abierto Lago Puelo', rated: true, time: '18:30', source: 'otb', eloChange: 3, kFactor: 20 },
  { elo: 1889, color: 'W', result: 'L', opp: 'Jonas Nahuelmir', opp_elo: 1727, eco: 'A20', tournament: 'Abierto Lago Puelo', rated: true, time: '14:00', source: 'otb', eloChange: -14, kFactor: 20 },
  { elo: 1889, color: 'B', result: 'L', opp: 'Eliseo Torres', opp_elo: 1658, eco: 'A56', tournament: 'Abierto Lago Puelo', rated: true, time: '19:00', source: 'otb', eloChange: -16, kFactor: 20 },
  { elo: 1889, color: 'W', result: 'D', opp: 'Aarón Pizarro Rozas', opp_elo: 1601, eco: 'A13', tournament: 'Abierto Lago Puelo', rated: true, time: '14:00', source: 'otb', eloChange: -7, kFactor: 20 },
  { elo: 1889, color: 'B', result: 'W', opp: 'Pedro Bustos', opp_elo: 1622, eco: 'B35', tournament: 'Abierto Lago Puelo', rated: true, time: '19:00', source: 'otb', eloChange: 4, kFactor: 20 },
  { elo: 1889, color: 'W', result: 'W', opp: 'Xavier Cugat', opp_elo: 1710, eco: 'A10', tournament: 'Abierto Lago Puelo', rated: true, time: '09:00', source: 'otb', eloChange: 5, kFactor: 20 },
  { elo: 1889, color: 'W', result: 'D', opp: 'Dario Castiglioni', opp_elo: 1783, eco: 'A13', tournament: 'Abierto Lago Puelo', rated: true, time: '14:00', source: 'otb', eloChange: -3, kFactor: 20 },

  // IRT Soberanía Nacional (game 35+) - In progress
  { elo: 1889, color: 'W', result: 'W', opp: 'Fernando Quintans', opp_elo: 1670, eco: 'A25', tournament: 'IRT Soberanía Nacional', rated: true, source: 'otb', eloChange: 4, kFactor: 20 },
  { elo: 1889, color: 'B', result: 'W', opp: 'Tomas Marinesco', opp_elo: 1761, eco: 'B35', tournament: 'IRT Soberanía Nacional', rated: true, source: 'otb', eloChange: 6, kFactor: 20 },
  { elo: 1889, color: 'B', result: 'W', opp: 'Ezequiel Gullace', opp_elo: 1933, eco: 'A45', tournament: 'IRT Soberanía Nacional', rated: true, source: 'otb', eloChange: 12, kFactor: 20 },
  { elo: 1889, color: 'W', result: 'L', opp: 'Stefan Botz', opp_elo: 1916, eco: 'A20', tournament: 'IRT Soberanía Nacional', rated: true, source: 'otb', eloChange: -10, kFactor: 20 },
  { elo: 1889, color: 'B', result: 'W', opp: 'Thiago Chocala', opp_elo: 1743, eco: 'B35', tournament: 'IRT Soberanía Nacional', rated: true, source: 'otb', eloChange: 7, kFactor: 20 },

  // IRT Carnaval - CAVP (game 40+) - In progress
  { elo: 1880, color: 'W', result: 'W', opp: 'Thiago Bowerman', opp_elo: 1470, eco: 'A20', tournament: 'IRT Carnaval', rated: true, source: 'otb', eloChange: 2, kFactor: 20 },
  { elo: 1880, color: 'B', result: 'L', opp: 'Fernando Gil Chacon', opp_elo: 2062, eco: 'B34', tournament: 'IRT Carnaval', rated: true, source: 'otb', eloChange: -5, kFactor: 20 },
  { elo: 1880, color: 'W', result: 'W', opp: 'Lorenzo Candiloro', opp_elo: 1637, eco: 'A20', tournament: 'IRT Carnaval', rated: true, source: 'otb', eloChange: 4, kFactor: 20 },
  { elo: 1880, color: 'B', result: 'D', opp: 'Jonathan Borras', opp_elo: 1743, eco: 'B22', tournament: 'IRT Carnaval', rated: true, source: 'otb', eloChange: -4, kFactor: 20 },
  { elo: 1880, color: 'B', result: 'L', opp: 'Gustavo Aguila', opp_elo: 2149, eco: 'A05', tournament: 'IRT Carnaval', rated: true, source: 'otb', eloChange: -3, kFactor: 20 },
  { elo: 1880, color: 'W', result: 'W', opp: 'Anibal Borras', opp_elo: 1688, eco: 'A15', tournament: 'IRT Carnaval', rated: true, source: 'otb', eloChange: 5, kFactor: 20 },
];

export const playerInfo: PlayerInfo = {
  current_elo: 1880,
  elo_change_last_tournament: -2,
  last_tournament: 'IRT Carnaval',
};

/** Seed set used only as the one-time database migration default (see
 * GamesContext's readLegacyLocalStorage) — the Openings Trainer tab itself
 * always reads from the database via fetchFlashcards(). */
export const initialOpenings: Omit<OpeningCard, 'id'>[] = [
  {
    name: "Sicilian Defense - Najdorf",
    moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6",
    fen: "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6",
    color: "black",
    difficulty: "advanced",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    name: "Italian Game - Main Line",
    moves: "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3",
    fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 4",
    color: "white",
    difficulty: "intermediate",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    name: "French Defense - Advance Variation",
    moves: "1.e4 e6 2.d4 d5 3.e5",
    fen: "rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3",
    color: "black",
    difficulty: "beginner",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    name: "Queen's Gambit Declined",
    moves: "1.d4 d5 2.c4 e6 3.Nc3 Nf6",
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4",
    color: "black",
    difficulty: "intermediate",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    name: "King's Indian Attack",
    moves: "1.Nf3 d5 2.g3 Nf6 3.Bg2 c5 4.O-O Nc6 5.d3 e6",
    fen: "r1bqkb1r/pp3ppp/2n1pn2/2pp4/8/3P1NP1/PPP1PPBP/RNBQ1RK1 w kq - 0 6",
    color: "white",
    difficulty: "intermediate",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    name: "Caro-Kann Defense - Classical",
    moves: "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4",
    fen: "rnbqkbnr/pp2pppp/2p5/8/3PN3/8/PPP2PPP/R1BQKBNR b KQkq - 0 4",
    color: "black",
    difficulty: "intermediate",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  }
];
