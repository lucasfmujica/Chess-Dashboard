/**
 * Initial games data
 * Games ordered chronologically by tournament
 */

export const initialGames = [
  // Club Argentino de Ajedrez (games 1-6) - Ends at 1727
  { elo: 1651, color: 'W', result: 'W', opp: 'Marcelo Prieto', opp_elo: 1902, eco: 'A25', tournament: 'Club Argentino de Ajedrez', rated: true, time: '19:00', source: 'otb', eloChange: 32, kFactor: 40 },
  { elo: 1651, color: 'B', result: 'W', opp: 'Vanesa Guzman', opp_elo: 1756, eco: 'B30', tournament: 'Club Argentino de Ajedrez', rated: true, time: '19:00', source: 'otb', eloChange: 26, kFactor: 40 },
  { elo: 1651, color: 'W', result: 'D', opp: 'Exequiel Medina', opp_elo: 1858, eco: 'A15', tournament: 'Club Argentino de Ajedrez', rated: true, time: '19:00', source: 'otb', eloChange: 11, kFactor: 40 },
  { elo: 1651, color: 'B', result: 'L', opp: 'Joaquin Rueda', opp_elo: 1996, eco: 'B26', tournament: 'Club Argentino de Ajedrez', rated: true, time: '19:00', source: 'otb', eloChange: -4, kFactor: 40 },
  { elo: 1651, color: 'W', result: 'L', opp: 'Walter Montero', opp_elo: 1884, eco: 'A20', tournament: 'Club Argentino de Ajedrez', rated: true, time: '19:00', source: 'otb', eloChange: -8, kFactor: 40 },
  { elo: 1651, color: 'W', result: 'W', opp: 'Maximiliano Lalli', opp_elo: 1691, eco: 'A37', tournament: 'Club Argentino de Ajedrez', rated: true, time: '19:00', source: 'otb', eloChange: 19, kFactor: 40 },
  { elo: 1651, color: 'B', result: 'D', opp: 'Ezequiel Paredes', opp_elo: 0, eco: 'B32', tournament: 'Club Argentino de Ajedrez', rated: false, time: '19:00', source: 'otb' },

  // Torre Blanca (games 7-10) - Ends at 1776
  { elo: 1727, color: 'W', result: 'L', opp: 'Raul Adrian Habiaga', opp_elo: 1984, eco: 'A29', tournament: 'Torre Blanca', rated: true, time: '19:00', source: 'otb', eloChange: -5, kFactor: 40 },
  { elo: 1727, color: 'B', result: 'W', opp: 'Daniel Federico', opp_elo: 0, eco: 'B20', tournament: 'Torre Blanca', rated: false, time: '19:00', source: 'otb' },
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

  // Masters Ciudad (games 11-19) - Ends at 1848
  { elo: 1776, color: 'W', result: 'D', opp: 'Agustín Meza Astrada', opp_elo: 2077, eco: 'A13', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: 14, kFactor: 40 },
  { elo: 1776, color: 'B', result: 'L', opp: 'Hernan Gastiaburo', opp_elo: 2239, eco: 'E91', tournament: 'Masters Ciudad', rated: true, time: '10:00', source: 'otb', eloChange: -3, kFactor: 40 },
  { elo: 1776, color: 'W', result: 'W', opp: 'Jorge Guelman', opp_elo: 1576, eco: 'A15', tournament: 'Masters Ciudad', rated: true, time: '17:00', source: 'otb', eloChange: 10, kFactor: 40 },
  { elo: 1776, color: 'B', result: 'L', opp: 'Federico Naspleda', opp_elo: 2052, eco: 'B31', tournament: 'Masters Ciudad', rated: true, time: '10:00', source: 'otb', eloChange: -7, kFactor: 40 },
  { elo: 1776, color: 'W', result: 'W', opp: 'Isaac Lainez Reyes', opp_elo: 1890, eco: 'A30', tournament: 'Masters Ciudad', rated: true, time: '17:00', source: 'otb', eloChange: 26, kFactor: 40 },
  { elo: 1776, color: 'B', result: 'L', opp: 'Facundo Simbler', opp_elo: 1903, eco: 'B35', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: -13, kFactor: 40 },
  { elo: 1776, color: 'W', result: 'W', opp: 'Thomas Castillo', opp_elo: 1997, eco: 'A10', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: 31, kFactor: 40 },
  { elo: 1776, color: 'B', result: 'L', opp: 'José Zamudio', opp_elo: 1921, eco: 'B21', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: -12, kFactor: 40 },
  { elo: 1776, color: 'W', result: 'W', opp: 'Enzo Alvarez', opp_elo: 1899, eco: 'A29', tournament: 'Masters Ciudad', rated: true, time: '19:30', source: 'otb', eloChange: 26, kFactor: 40 },

  // Abierto Madryn (games 20-25) - Ends at 1889
  { elo: 1848, color: 'B', result: 'W', opp: 'Carlos Gonzalez', opp_elo: 1405, eco: 'B23', tournament: 'Abierto Madryn', rated: true, time: '19:00', source: 'otb', eloChange: 3, kFactor: 40 },
  { elo: 1848, color: 'W', result: 'D', opp: 'Marzo Daniel Lucero', opp_elo: 2051, eco: 'A15', tournament: 'Abierto Madryn', rated: true, time: '14:00', source: 'otb', eloChange: 10, kFactor: 40 },
  { elo: 1848, color: 'B', result: 'D', opp: 'Teo Dante Cicciari', opp_elo: 1972, eco: 'A05', tournament: 'Abierto Madryn', rated: true, time: '18:00', source: 'otb', eloChange: 7, kFactor: 40 },
  { elo: 1848, color: 'W', result: 'W', opp: 'Jeremías De Los Santos', opp_elo: 1791, eco: 'A20', tournament: 'Abierto Madryn', rated: true, time: '14:00', source: 'otb', eloChange: 16, kFactor: 40 },
  { elo: 1848, color: 'B', result: 'L', opp: 'Martin Daneri', opp_elo: 2011, eco: 'B23', tournament: 'Abierto Madryn', rated: true, time: '18:00', source: 'otb', eloChange: -13, kFactor: 40 },
  { elo: 1848, color: 'W', result: 'W', opp: 'Sergio Alonso', opp_elo: 1754, eco: 'A20', tournament: 'Abierto Madryn', rated: true, time: '10:00', source: 'otb', eloChange: 18, kFactor: 40 },

  // Abierto Lago Puelo (games 26-32) - Ends at 1861
  { elo: 1889, color: 'B', result: 'W', opp: 'Pablo Rugiero', opp_elo: 1584, eco: 'A76', tournament: 'Abierto Lago Puelo', rated: true, time: '18:30', source: 'otb', eloChange: 3, kFactor: 20 },
  { elo: 1889, color: 'W', result: 'L', opp: 'Jonas Nahuelmir', opp_elo: 1727, eco: 'A20', tournament: 'Abierto Lago Puelo', rated: true, time: '14:00', source: 'otb', eloChange: -14, kFactor: 20 },
  { elo: 1889, color: 'B', result: 'L', opp: 'Eliseo Torres', opp_elo: 1658, eco: 'A56', tournament: 'Abierto Lago Puelo', rated: true, time: '19:00', source: 'otb', eloChange: -16, kFactor: 20 },
  { elo: 1889, color: 'W', result: 'D', opp: 'Aarón Pizarro Rozas', opp_elo: 1601, eco: 'A13', tournament: 'Abierto Lago Puelo', rated: true, time: '14:00', source: 'otb', eloChange: -7, kFactor: 20 },
  { elo: 1889, color: 'B', result: 'W', opp: 'Pedro Bustos', opp_elo: 1622, eco: 'B35', tournament: 'Abierto Lago Puelo', rated: true, time: '19:00', source: 'otb', eloChange: 4, kFactor: 20 },
  { elo: 1889, color: 'W', result: 'W', opp: 'Xavier Cugat', opp_elo: 1710, eco: 'A10', tournament: 'Abierto Lago Puelo', rated: true, time: '09:00', source: 'otb', eloChange: 5, kFactor: 20 },
  { elo: 1889, color: 'W', result: 'D', opp: 'Dario Castiglioni', opp_elo: 1783, eco: 'A13', tournament: 'Abierto Lago Puelo', rated: true, time: '14:00', source: 'otb', eloChange: -3, kFactor: 20 },
];

export const playerInfo = {
  current_elo: 1861,
  elo_change_last_tournament: -28,
  last_tournament: 'Abierto Lago Puelo',
};
