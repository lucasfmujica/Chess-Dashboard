import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LichessSyncPanel from './components/chess/LichessSyncPanel';
import AnalyticsTab from './components/chess/tabs/AnalyticsTab';
import BlackGamesTab from './components/chess/tabs/BlackGamesTab';
import GoalsTab from './components/chess/tabs/GoalsTab';
import OpeningsTab from './components/chess/tabs/OpeningsTab';
import OpponentsTab from './components/chess/tabs/OpponentsTab';
import OpponentStrengthTab from './components/chess/tabs/OpponentStrengthTab';
import OverviewTab from './components/chess/tabs/OverviewTab';
import RatingTab from './components/chess/tabs/RatingTab';
import RepertoireTab from './components/chess/tabs/RepertoireTab';
import TournamentsTab from './components/chess/tabs/TournamentsTab';
import TrainingTab from './components/chess/tabs/TrainingTab';
import TrendsTab from './components/chess/tabs/TrendsTab';
import WhiteGamesTab from './components/chess/tabs/WhiteGamesTab';
import { Swords, Target, TrendingUp, Trophy } from './components/icons/ChessIcons';
import { ecoNames } from './constants/ecoNames';
import { trainingActivities } from './constants/trainingActivities';
import { mergeGames } from './utils/lichessApi';

const ChessDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [gameFilter, setGameFilter] = useState('otb'); // 'all', 'otb', 'online'
  const [mainRepertoire, setMainRepertoire] = useState({
    white: ['A15', 'A20', 'A13', 'A10'],
    black: ['B35', 'B30', 'B23']
  });
  const [targetElo, setTargetElo] = useState(1950);
  const [targetDate, setTargetDate] = useState('2025-12-31');

  // Training plan state
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date(2025, 10, 15); // Saturday Nov 15, 2025 (month is 0-indexed)
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const startOfWeek = new Date(today);
    // Find Monday of current week (1 = Monday)
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days, else go back (dayOfWeek - 1) days
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const day = String(startOfWeek.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [weeklyPlans, setWeeklyPlans] = useState({});
  const [dailyNotes, setDailyNotes] = useState({});
  const [editingDay, setEditingDay] = useState(null);
  const [weeklyHours, setWeeklyHours] = useState(6);
  const [whiteSortBy, setWhiteSortBy] = useState('date');
  const [whiteSortOrder, setWhiteSortOrder] = useState('desc');
  const [blackSortBy, setBlackSortBy] = useState('date');
  const [blackSortOrder, setBlackSortOrder] = useState('desc');
  const [showPgnImport, setShowPgnImport] = useState(false);
  const [pgnText, setPgnText] = useState('');

  const playerInfo = {
    current_elo: 1861,
    elo_change_last_tournament: -28,
    last_tournament: "Abierto Lago Puelo"
  };

  // Games ordered chronologically by tournament
  const [games, setGames] = useState([
    // Club Argentino de Ajedrez (games 1-7)
    { "elo": 1651, "color": "W", "result": "W", "opp": "Marcelo Prieto", "opp_elo": 1902, "eco": "A25", "tournament": "Club Argentino de Ajedrez", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "B", "result": "W", "opp": "Vanesa Guzman", "opp_elo": 1756, "eco": "B30", "tournament": "Club Argentino de Ajedrez", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "W", "result": "D", "opp": "Exequiel Medina", "opp_elo": 1858, "eco": "A15", "tournament": "Club Argentino de Ajedrez", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "B", "result": "L", "opp": "Joaquin Rueda", "opp_elo": 1996, "eco": "B26", "tournament": "Club Argentino de Ajedrez", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "W", "result": "L", "opp": "Walter Montero", "opp_elo": 1884, "eco": "A20", "tournament": "Club Argentino de Ajedrez", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "W", "result": "W", "opp": "Maximiliano Lalli", "opp_elo": 1691, "eco": "A37", "tournament": "Club Argentino de Ajedrez", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "B", "result": "D", "opp": "Ezequiel Paredes", "opp_elo": 0, "eco": "B32", "tournament": "Club Argentino de Ajedrez", "rated": true, "time": "19:00", "source": "otb" },

    // Torre Blanca (games 8-12)
    { "elo": 1651, "color": "W", "result": "L", "opp": "Raul Adrian Habiaga", "opp_elo": 1984, "eco": "A29", "tournament": "Torre Blanca", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "B", "result": "W", "opp": "Daniel Federico", "opp_elo": 0, "eco": "B20", "tournament": "Torre Blanca", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "B", "result": "D", "opp": "Marcelo Maucci", "opp_elo": 1768, "eco": "B37", "tournament": "Torre Blanca", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "W", "result": "W", "opp": "German Cisneros", "opp_elo": 1914, "eco": "A15", "tournament": "Torre Blanca", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1651, "color": "W", "result": "D", "opp": "Dario Moreno", "opp_elo": 1910, "eco": "A15", "tournament": "Torre Blanca", "rated": true, "time": "19:00", "source": "otb" },

    // Club Zugzwang (unrated)
    { "elo": 1651, "color": "B", "result": "W", "opp": "Maria Paula Arias", "opp_elo": 1736, "eco": "A70", "tournament": "Club Zugzwang", "rated": false, "source": "otb" },
    { "elo": 1651, "color": "W", "result": "L", "opp": "Anibal Borras", "opp_elo": 1731, "eco": "A15", "tournament": "Club Zugzwang", "rated": false, "source": "otb" },
    { "elo": 1651, "color": "W", "result": "W", "opp": "Gabriel Izak", "opp_elo": 2046, "eco": "A13", "tournament": "Club Zugzwang", "rated": false, "source": "otb" },
    { "elo": 1651, "color": "B", "result": "W", "opp": "Jesuan Letizia", "opp_elo": 1486, "eco": "A45", "tournament": "Club Zugzwang", "rated": false, "source": "otb" },
    { "elo": 1651, "color": "B", "result": "L", "opp": "Hugo Massenzana", "opp_elo": 2025, "eco": "A46", "tournament": "Club Zugzwang", "rated": false, "source": "otb" },
    { "elo": 1651, "color": "W", "result": "W", "opp": "Juan Vilches", "opp_elo": 1854, "eco": "A14", "tournament": "Club Zugzwang", "rated": false, "source": "otb" },

    // Masters Ciudad (games 13-21)
    { "elo": 1776, "color": "W", "result": "D", "opp": "Agustín Meza Astrada", "opp_elo": 2077, "eco": "A13", "tournament": "Masters Ciudad", "rated": true, "time": "19:30", "source": "otb" },
    { "elo": 1776, "color": "B", "result": "L", "opp": "Hernan Gastiaburo", "opp_elo": 2239, "eco": "E91", "tournament": "Masters Ciudad", "rated": true, "time": "10:00", "source": "otb" },
    { "elo": 1776, "color": "W", "result": "W", "opp": "Jorge Guelman", "opp_elo": 1576, "eco": "A15", "tournament": "Masters Ciudad", "rated": true, "time": "17:00", "source": "otb" },
    { "elo": 1776, "color": "B", "result": "L", "opp": "Federico Naspleda", "opp_elo": 2052, "eco": "B31", "tournament": "Masters Ciudad", "rated": true, "time": "10:00", "source": "otb" },
    { "elo": 1776, "color": "W", "result": "W", "opp": "Isaac Lainez Reyes", "opp_elo": 1890, "eco": "A30", "tournament": "Masters Ciudad", "rated": true, "time": "17:00", "source": "otb" },
    { "elo": 1776, "color": "B", "result": "L", "opp": "Facundo Simbler", "opp_elo": 1903, "eco": "B35", "tournament": "Masters Ciudad", "rated": true, "time": "19:30", "source": "otb" },
    { "elo": 1776, "color": "W", "result": "W", "opp": "Thomas Castillo", "opp_elo": 1997, "eco": "A10", "tournament": "Masters Ciudad", "rated": true, "time": "19:30", "source": "otb" },
    { "elo": 1776, "color": "B", "result": "L", "opp": "José Zamudio", "opp_elo": 1921, "eco": "B21", "tournament": "Masters Ciudad", "rated": true, "time": "19:30", "source": "otb" },
    { "elo": 1776, "color": "W", "result": "W", "opp": "Enzo Alvarez", "opp_elo": 1899, "eco": "A29", "tournament": "Masters Ciudad", "rated": true, "time": "19:30", "source": "otb" },

    // Abierto Madryn (games 22-27)
    { "elo": 1848, "color": "B", "result": "W", "opp": "Carlos Gonzalez", "opp_elo": 1486, "eco": "B23", "tournament": "Abierto Madryn", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1848, "color": "W", "result": "D", "opp": "Marzo Daniel Lucero", "opp_elo": 2051, "eco": "A15", "tournament": "Abierto Madryn", "rated": true, "time": "14:00", "source": "otb" },
    { "elo": 1848, "color": "B", "result": "D", "opp": "Teo Dante Cicciari", "opp_elo": 1972, "eco": "A05", "tournament": "Abierto Madryn", "rated": true, "time": "18:00", "source": "otb" },
    { "elo": 1848, "color": "W", "result": "W", "opp": "Jeremías De Los Santos", "opp_elo": 1791, "eco": "A20", "tournament": "Abierto Madryn", "rated": true, "time": "14:00", "source": "otb" },
    { "elo": 1848, "color": "B", "result": "L", "opp": "Martin Daneri", "opp_elo": 2011, "eco": "B23", "tournament": "Abierto Madryn", "rated": true, "time": "18:00", "source": "otb" },
    { "elo": 1848, "color": "W", "result": "W", "opp": "Sergio Alonso", "opp_elo": 1754, "eco": "A20", "tournament": "Abierto Madryn", "rated": true, "time": "10:00", "source": "otb" },

    // Abierto Lago Puelo (games 28-34)
    { "elo": 1889, "color": "B", "result": "W", "opp": "Pablo Rugiero", "opp_elo": 1584, "eco": "A76", "tournament": "Abierto Lago Puelo", "rated": true, "time": "18:30", "source": "otb" },
    { "elo": 1889, "color": "W", "result": "L", "opp": "Jonas Nahuelmir", "opp_elo": 1727, "eco": "A20", "tournament": "Abierto Lago Puelo", "rated": true, "time": "14:00", "source": "otb" },
    { "elo": 1889, "color": "B", "result": "L", "opp": "Eliseo Torres", "opp_elo": 1658, "eco": "A56", "tournament": "Abierto Lago Puelo", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1889, "color": "W", "result": "D", "opp": "Aarón Pizarro Rozas", "opp_elo": 1601, "eco": "A13", "tournament": "Abierto Lago Puelo", "rated": true, "time": "14:00", "source": "otb" },
    { "elo": 1889, "color": "B", "result": "W", "opp": "Pedro Bustos", "opp_elo": 1622, "eco": "B35", "tournament": "Abierto Lago Puelo", "rated": true, "time": "19:00", "source": "otb" },
    { "elo": 1889, "color": "W", "result": "W", "opp": "Xavier Cugat", "opp_elo": 1710, "eco": "A10", "tournament": "Abierto Lago Puelo", "rated": true, "time": "09:00", "source": "otb" },
    { "elo": 1889, "color": "W", "result": "D", "opp": "Dario Castiglioni", "opp_elo": 1783, "eco": "A13", "tournament": "Abierto Lago Puelo", "rated": true, "time": "14:00", "source": "otb" }
  ]);

  // Handler for Lichess game sync
  const handleLichessSync = (transformedGames) => {
    const merged = mergeGames(games, transformedGames);
    setGames(merged);
  };

  // Filter games based on source
  const filteredGames = useMemo(() => {
    if (gameFilter === 'all') return games;
    if (gameFilter === 'otb') return games.filter(g => g.source === 'otb' || !g.source);
    if (gameFilter === 'online') return games.filter(g => g.source === 'lichess');
    return games;
  }, [games, gameFilter]);

  const ratedGames = useMemo(() => filteredGames.filter(g => g.rated), [filteredGames]);

  const tournamentOrder = useMemo(() =>
    ["Club Argentino de Ajedrez", "Torre Blanca", "Masters Ciudad", "Abierto Madryn", "Abierto Lago Puelo"],
    []
  );

  const eloHistory = useMemo(() => {
    const history = [];

    ratedGames.forEach((game, idx) => {
      const expectedScore = game.opp_elo > 0 ? 1 / (1 + Math.pow(10, (game.opp_elo - game.elo) / 400)) : 0.5;
      const actualScore = game.result === 'W' ? 1 : game.result === 'D' ? 0.5 : 0;

      history.push({
        game: idx + 1,
        elo: game.elo,
        tournament: game.tournament,
        opponent: game.opp,
        eco: game.eco,
        opening: ecoNames[game.eco] || game.eco,
        expected: expectedScore,
        actual: actualScore,
        diff: actualScore - expectedScore
      });
    });

    return history;
  }, [ratedGames]);

  const overallStats = useMemo(() => {
    const wins = ratedGames.filter(g => g.result === 'W').length;
    const draws = ratedGames.filter(g => g.result === 'D').length;
    const losses = ratedGames.filter(g => g.result === 'L').length;
    const total = ratedGames.length;

    const totalExpected = ratedGames.reduce((sum, g) => {
      return sum + (g.opp_elo > 0 ? (1 / (1 + Math.pow(10, (g.opp_elo - g.elo) / 400))) : 0.5);
    }, 0);

    const totalActual = wins + draws * 0.5;
    const avgOppElo = Math.round(ratedGames.filter(g => g.opp_elo > 0).reduce((sum, g) => sum + g.opp_elo, 0) / ratedGames.filter(g => g.opp_elo > 0).length);
    const performanceRating = totalActual > 0 && totalActual < total ?
      Math.round(avgOppElo + 400 * Math.log10(totalActual / (total - totalActual))) : avgOppElo;

    return {
      wins, draws, losses, total,
      winRate: ((wins / total) * 100).toFixed(1),
      expectedScore: totalExpected.toFixed(1),
      actualScore: totalActual.toFixed(1),
      performanceRating
    };
  }, [ratedGames]);

  const tournamentStats = useMemo(() => {
    const byTournament = {};

    // Actual ELO at start of each tournament
    const tournamentStartElos = {
      'Club Argentino de Ajedrez': 1651,
      'Torre Blanca': 1727,
      'Masters Ciudad': 1776,
      'Abierto Madryn': 1848,
      'Abierto Lago Puelo': 1889
    };

    // Calculate ELO changes (next tournament start - current tournament start)
    const tournamentEloChanges = {
      'Club Argentino de Ajedrez': 1727 - 1651,  // +76
      'Torre Blanca': 1776 - 1727,                // +49
      'Masters Ciudad': 1848 - 1776,              // +72
      'Abierto Madryn': 1889 - 1848,              // +41
      'Abierto Lago Puelo': 1861 - 1889           // -28 (current ELO - last tournament)
    };

    const tournamentPerformanceRatings = {
      'Club Argentino de Ajedrez': 1777,
      'Torre Blanca': 1787,
      'Masters Ciudad': 1950,
      'Abierto Madryn': 1956,
      'Abierto Lago Puelo': 1719
    };

    ratedGames.forEach(game => {
      if (!byTournament[game.tournament]) {
        byTournament[game.tournament] = {
          games: [],
          wins: 0,
          draws: 0,
          losses: 0
        };
      }
      byTournament[game.tournament].games.push(game);
      if (game.result === 'W') byTournament[game.tournament].wins++;
      if (game.result === 'D') byTournament[game.tournament].draws++;
      if (game.result === 'L') byTournament[game.tournament].losses++;
    });

    return tournamentOrder
      .filter(t => byTournament[t])
      .map((tournament, idx, arr) => {
        const stats = byTournament[tournament];
        const total = stats.games.length;
        const actualScore = stats.wins + stats.draws * 0.5;
        const ratedOpponents = stats.games.filter(g => g.opp_elo > 0);
        const avgOppElo = ratedOpponents.length > 0 ?
          Math.round(ratedOpponents.reduce((sum, g) => sum + g.opp_elo, 0) / ratedOpponents.length) : 0;

        const performanceRating = actualScore > 0 && actualScore < total && avgOppElo > 0 ?
          Math.round(avgOppElo + 400 * Math.log10(actualScore / (total - actualScore))) : avgOppElo;

        // Calculate performance for white pieces
        const whiteGames = stats.games.filter(g => g.color === 'W');
        const whiteWins = whiteGames.filter(g => g.result === 'W').length;
        const whiteDraws = whiteGames.filter(g => g.result === 'D').length;
        const whiteTotal = whiteGames.length;
        const whiteScore = whiteWins + whiteDraws * 0.5;
        const whiteRatedOpps = whiteGames.filter(g => g.opp_elo > 0);
        const whiteAvgOpp = whiteRatedOpps.length > 0 ?
          Math.round(whiteRatedOpps.reduce((sum, g) => sum + g.opp_elo, 0) / whiteRatedOpps.length) : 0;
        let whitePerformance;
        if (whiteTotal === 0 || whiteAvgOpp === 0) {
          whitePerformance = '-';
        } else if (whiteScore === 0) {
          whitePerformance = Math.round(whiteAvgOpp - 400);
        } else if (whiteScore === whiteTotal) {
          whitePerformance = Math.round(whiteAvgOpp + 400);
        } else {
          whitePerformance = Math.round(whiteAvgOpp + 400 * Math.log10(whiteScore / (whiteTotal - whiteScore)));
        }

        // Calculate performance for black pieces
        const blackGames = stats.games.filter(g => g.color === 'B');
        const blackWins = blackGames.filter(g => g.result === 'W').length;
        const blackDraws = blackGames.filter(g => g.result === 'D').length;
        const blackTotal = blackGames.length;
        const blackScore = blackWins + blackDraws * 0.5;
        const blackRatedOpps = blackGames.filter(g => g.opp_elo > 0);
        const blackAvgOpp = blackRatedOpps.length > 0 ?
          Math.round(blackRatedOpps.reduce((sum, g) => sum + g.opp_elo, 0) / blackRatedOpps.length) : 0;
        let blackPerformance;
        if (blackTotal === 0 || blackAvgOpp === 0) {
          blackPerformance = '-';
        } else if (blackScore === 0) {
          blackPerformance = Math.round(blackAvgOpp - 400);
        } else if (blackScore === blackTotal) {
          blackPerformance = Math.round(blackAvgOpp + 400);
        } else {
          blackPerformance = Math.round(blackAvgOpp + 400 * Math.log10(blackScore / (blackTotal - blackScore)));
        }

        // Get actual ELO values for this tournament
        const eloBefore = tournamentStartElos[tournament] || 1651;
        const eloAfter = eloBefore + (tournamentEloChanges[tournament] || 0);

        return {
          tournament,
          name: tournament, // Add name field for OverviewTab
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          total,
          score: `${actualScore}/${total}`,
          performanceRating: tournamentPerformanceRatings[tournament] || performanceRating,
          avgOppElo,
          eloChange: tournamentEloChanges[tournament] || 0,
          eloBefore, // ELO at start of tournament
          eloAfter, // ELO after tournament
          whitePerformance,
          blackPerformance
        };
      });
  }, [ratedGames, tournamentOrder]);

  // Calculate best and worst results
  const bestResults = useMemo(() => {
    return ratedGames
      .filter(g => g.result === 'W' && g.opp_elo > 0)
      .sort((a, b) => (b.opp_elo - a.elo) - (a.opp_elo - a.elo))
      .slice(0, 3)
      .map(g => ({
        opponent: g.opp,
        elo: g.elo,
        oppElo: g.opp_elo,
        diff: g.opp_elo - g.elo,
        eco: g.eco,
        opening: ecoNames[g.eco] || g.eco,
        color: g.color,
        tournament: g.tournament
      }));
  }, [ratedGames]);

  const worstResults = useMemo(() => {
    return ratedGames
      .filter(g => g.result === 'L' && g.opp_elo > 0)
      .sort((a, b) => (b.elo - b.opp_elo) - (a.elo - a.opp_elo)) // Sort by biggest positive diff (you were rated higher)
      .slice(0, 3)
      .map(g => ({
        opponent: g.opp,
        elo: g.elo,
        oppElo: g.opp_elo,
        diff: g.elo - g.opp_elo, // Positive if you were rated higher
        eco: g.eco,
        opening: ecoNames[g.eco] || g.eco,
        color: g.color,
        tournament: g.tournament
      }));
  }, [ratedGames]);

  const opponentBracketStats = useMemo(() => {
    const brackets = {
      lower: { name: 'Lower rated (-100+)', games: [], wins: 0, draws: 0, losses: 0 },
      similar: { name: 'Similar (±100)', games: [], wins: 0, draws: 0, losses: 0 },
      higher: { name: 'Higher rated (+100+)', games: [], wins: 0, draws: 0, losses: 0 }
    };

    ratedGames.filter(g => g.opp_elo > 0).forEach(game => {
      const diff = game.opp_elo - game.elo;
      let bracket;

      if (diff < -100) bracket = 'lower';
      else if (diff > 100) bracket = 'higher';
      else bracket = 'similar';

      brackets[bracket].games.push(game);
      if (game.result === 'W') brackets[bracket].wins++;
      if (game.result === 'D') brackets[bracket].draws++;
      if (game.result === 'L') brackets[bracket].losses++;
    });

    return Object.values(brackets).map(b => ({
      bracket: b.name,
      total: b.games.length,
      wins: b.wins,
      draws: b.draws,
      losses: b.losses,
      winRate: b.games.length > 0 ? ((b.wins / b.games.length) * 100).toFixed(1) : '0.0',
      score: `${(b.wins + b.draws * 0.5).toFixed(1)}/${b.games.length}`
    }));
  }, [ratedGames]);

  const whiteStats = useMemo(() => {
    const whiteGames = ratedGames.filter(g => g.color === 'W');
    const wins = whiteGames.filter(g => g.result === 'W').length;
    const draws = whiteGames.filter(g => g.result === 'D').length;
    const losses = whiteGames.filter(g => g.result === 'L').length;
    const total = whiteGames.length;
    const actualScore = wins + draws * 0.5;

    const ratedOpponents = whiteGames.filter(g => g.opp_elo > 0);
    const avgOppElo = ratedOpponents.length > 0 ?
      Math.round(ratedOpponents.reduce((sum, g) => sum + g.opp_elo, 0) / ratedOpponents.length) : 0;
    const performanceRating = actualScore > 0 && actualScore < total && avgOppElo > 0 ?
      Math.round(avgOppElo + 400 * Math.log10(actualScore / (total - actualScore))) : avgOppElo;

    const ecoStats = {};
    whiteGames.forEach(game => {
      if (!ecoStats[game.eco]) {
        ecoStats[game.eco] = { games: 0, wins: 0, draws: 0, losses: 0, name: ecoNames[game.eco] || game.eco };
      }
      ecoStats[game.eco].games++;
      if (game.result === 'W') ecoStats[game.eco].wins++;
      if (game.result === 'D') ecoStats[game.eco].draws++;
      if (game.result === 'L') ecoStats[game.eco].losses++;
    });

    const openings = Object.entries(ecoStats)
      .map(([eco, stats]) => ({
        eco,
        name: stats.name,
        games: stats.games,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        score: `${(stats.wins + stats.draws * 0.5).toFixed(1)}/${stats.games}`,
        winRate: ((stats.wins / stats.games) * 100).toFixed(1)
      }))
      .sort((a, b) => b.games - a.games);

    return {
      total, wins, draws, losses,
      winRate: ((wins / total) * 100).toFixed(1),
      score: `${actualScore.toFixed(1)}/${total}`,
      performanceRating,
      openings
    };
  }, [ratedGames]);

  const blackStats = useMemo(() => {
    const blackGames = ratedGames.filter(g => g.color === 'B');
    const wins = blackGames.filter(g => g.result === 'W').length;
    const draws = blackGames.filter(g => g.result === 'D').length;
    const losses = blackGames.filter(g => g.result === 'L').length;
    const total = blackGames.length;
    const actualScore = wins + draws * 0.5;

    const ratedOpponents = blackGames.filter(g => g.opp_elo > 0);
    const avgOppElo = ratedOpponents.length > 0 ?
      Math.round(ratedOpponents.reduce((sum, g) => sum + g.opp_elo, 0) / ratedOpponents.length) : 0;
    const performanceRating = actualScore > 0 && actualScore < total && avgOppElo > 0 ?
      Math.round(avgOppElo + 400 * Math.log10(actualScore / (total - actualScore))) : avgOppElo;

    const ecoStats = {};
    blackGames.forEach(game => {
      if (!ecoStats[game.eco]) {
        ecoStats[game.eco] = { games: 0, wins: 0, draws: 0, losses: 0, name: ecoNames[game.eco] || game.eco };
      }
      ecoStats[game.eco].games++;
      if (game.result === 'W') ecoStats[game.eco].wins++;
      if (game.result === 'D') ecoStats[game.eco].draws++;
      if (game.result === 'L') ecoStats[game.eco].losses++;
    });

    const openings = Object.entries(ecoStats)
      .map(([eco, stats]) => ({
        eco,
        name: stats.name,
        games: stats.games,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        score: `${(stats.wins + stats.draws * 0.5).toFixed(1)}/${stats.games}`,
        winRate: ((stats.wins / stats.games) * 100).toFixed(1)
      }))
      .sort((a, b) => b.games - a.games);

    return {
      total, wins, draws, losses,
      winRate: ((wins / total) * 100).toFixed(1),
      score: `${actualScore.toFixed(1)}/${total}`,
      performanceRating,
      openings
    };
  }, [ratedGames]);

  const allOpeningsStats = useMemo(() => {
    const ecoStats = {};

    ratedGames.forEach(game => {
      if (!ecoStats[game.eco]) {
        ecoStats[game.eco] = { games: 0, wins: 0, draws: 0, losses: 0, color: {}, name: ecoNames[game.eco] || game.eco };
      }
      ecoStats[game.eco].games++;
      if (game.result === 'W') ecoStats[game.eco].wins++;
      if (game.result === 'D') ecoStats[game.eco].draws++;
      if (game.result === 'L') ecoStats[game.eco].losses++;

      if (!ecoStats[game.eco].color[game.color]) {
        ecoStats[game.eco].color[game.color] = 0;
      }
      ecoStats[game.eco].color[game.color]++;
    });

    return Object.entries(ecoStats)
      .map(([eco, stats]) => ({
        eco,
        name: stats.name,
        games: stats.games,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        score: `${(stats.wins + stats.draws * 0.5).toFixed(1)}/${stats.games}`,
        winRate: parseFloat(((stats.wins / stats.games) * 100).toFixed(1)),
        asWhite: stats.color['W'] || 0,
        asBlack: stats.color['B'] || 0
      }))
      .sort((a, b) => b.games - a.games);
  }, [ratedGames]);

  const bracketGames = useMemo(() => {
    if (!selectedBracket) return [];

    return ratedGames
      .filter(g => g.opp_elo > 0)
      .map((game, idx) => {
        const diff = game.opp_elo - game.elo;
        let bracket;

        if (diff < -100) bracket = 'lower';
        else if (diff > 100) bracket = 'higher';
        else bracket = 'similar';

        return {
          ...game,
          gameNumber: idx + 1,
          bracket,
          ratingDiff: diff,
          opening: ecoNames[game.eco] || game.eco
        };
      })
      .filter(g => g.bracket === selectedBracket);
  }, [ratedGames, selectedBracket]);

  // Time-based trends
  const monthlyStats = useMemo(() => {
    const byMonth = {};
    const tournamentEloChanges = {
      'Club Argentino de Ajedrez': +76,
      'Torre Blanca': +49,
      'Masters Ciudad': +72,
      'Abierto Madryn': +41,
      'Abierto Lago Puelo': -28
    };

    tournamentOrder.forEach((tournament, idx) => {
      const tournamentGames = ratedGames.filter(g => g.tournament === tournament);
      if (tournamentGames.length === 0) return;

      const wins = tournamentGames.filter(g => g.result === 'W').length;
      const draws = tournamentGames.filter(g => g.result === 'D').length;
      const losses = tournamentGames.filter(g => g.result === 'L').length;
      const total = tournamentGames.length;
      const winRate = ((wins / total) * 100).toFixed(1);

      const ratedOpps = tournamentGames.filter(g => g.opp_elo > 0);
      const avgOppElo = ratedOpps.length > 0 ?
        Math.round(ratedOpps.reduce((sum, g) => sum + g.opp_elo, 0) / ratedOpps.length) : 0;

      const actualScore = wins + draws * 0.5;
      const performanceRating = actualScore > 0 && actualScore < total && avgOppElo > 0 ?
        Math.round(avgOppElo + 400 * Math.log10(actualScore / (total - actualScore))) : avgOppElo;

      byMonth[tournament] = {
        tournament,
        order: idx,
        games: total,
        wins,
        draws,
        losses,
        winRate: parseFloat(winRate),
        performanceRating,
        elo: tournamentGames[0].elo,
        eloChange: tournamentEloChanges[tournament] || 0
      };
    });

    return Object.values(byMonth).sort((a, b) => a.order - b.order);
  }, [ratedGames, tournamentOrder]);

  const formStats = useMemo(() => {
    const calculateForm = (lastN) => {
      const recentGames = ratedGames.slice(-lastN);
      const wins = recentGames.filter(g => g.result === 'W').length;
      const draws = recentGames.filter(g => g.result === 'D').length;
      const score = wins + draws * 0.5;
      return {
        games: recentGames.length,
        score: `${score.toFixed(1)}/${recentGames.length}`,
        percentage: ((score / recentGames.length) * 100).toFixed(1),
        details: recentGames.map(g => g.result).reverse()
      };
    };

    return {
      last5: calculateForm(5),
      last10: calculateForm(10)
    };
  }, [ratedGames]);

  const streaks = useMemo(() => {
    let currentStreak = { type: null, count: 0 };
    let longestWinStreak = 0;
    let longestUnbeatenStreak = 0;
    let currentWinStreak = 0;
    let currentUnbeatenStreak = 0;

    ratedGames.forEach(game => {
      if (game.result === 'W') {
        currentWinStreak++;
        currentUnbeatenStreak++;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, currentUnbeatenStreak);
      } else if (game.result === 'D') {
        currentWinStreak = 0;
        currentUnbeatenStreak++;
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, currentUnbeatenStreak);
      } else {
        currentWinStreak = 0;
        currentUnbeatenStreak = 0;
      }
    });

    // Current streak
    for (let i = ratedGames.length - 1; i >= 0; i--) {
      const game = ratedGames[i];
      if (currentStreak.type === null) {
        currentStreak.type = game.result === 'L' ? 'loss' : game.result === 'W' ? 'win' : 'unbeaten';
        currentStreak.count = 1;
      } else if (
        (currentStreak.type === 'win' && game.result === 'W') ||
        (currentStreak.type === 'loss' && game.result === 'L') ||
        (currentStreak.type === 'unbeaten' && (game.result === 'W' || game.result === 'D'))
      ) {
        currentStreak.count++;
      } else {
        break;
      }
    }

    return {
      current: currentStreak,
      longestWin: longestWinStreak,
      longestUnbeaten: longestUnbeatenStreak
    };
  }, [ratedGames]);

  // Opening repertoire analysis
  const openingRepertoireAnalysis = useMemo(() => {
    const analyzeColor = (color, repertoire) => {
      const colorGames = ratedGames.filter(g => g.color === color);

      return allOpeningsStats
        .filter(o => color === 'W' ? o.asWhite > 0 : o.asBlack > 0)
        .map(opening => {
          const isMain = repertoire.includes(opening.eco);
          const games = color === 'W' ? opening.asWhite : opening.asBlack;
          const stats = colorGames.filter(g => g.eco === opening.eco);
          const wins = stats.filter(g => g.result === 'W').length;
          const draws = stats.filter(g => g.result === 'D').length;
          const losses = stats.filter(g => g.result === 'L').length;
          const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0';

          return {
            ...opening,
            isMain,
            games,
            wins,
            draws,
            losses,
            winRate: parseFloat(winRate),
            needsWork: games >= 3 && parseFloat(winRate) < 40
          };
        })
        .sort((a, b) => b.games - a.games);
    };

    return {
      white: analyzeColor('W', mainRepertoire.white),
      black: analyzeColor('B', mainRepertoire.black)
    };
  }, [ratedGames, allOpeningsStats, mainRepertoire]);

  const openingRecommendations = useMemo(() => {
    const recommendations = [];

    // Find openings that need work
    [...openingRepertoireAnalysis.white, ...openingRepertoireAnalysis.black]
      .filter(o => o.needsWork)
      .forEach(opening => {
        recommendations.push({
          type: 'needs_work',
          opening: opening.name,
          eco: opening.eco,
          reason: `Low success rate (${opening.winRate}%) in ${opening.games} games`,
          priority: 'high'
        });
      });

    // Find frequently faced openings as Black
    const blackOpenings = ratedGames.filter(g => g.color === 'B');
    const opponentOpenings = {};
    blackOpenings.forEach(g => {
      if (!opponentOpenings[g.eco]) {
        opponentOpenings[g.eco] = { count: 0, wins: 0 };
      }
      opponentOpenings[g.eco].count++;
      if (g.result === 'W') opponentOpenings[g.eco].wins++;
    });

    Object.entries(opponentOpenings)
      .filter(([eco, stats]) => stats.count >= 2 && (stats.wins / stats.count) < 0.4)
      .forEach(([eco, stats]) => {
        recommendations.push({
          type: 'opponent_preparation',
          opening: ecoNames[eco] || eco,
          eco,
          reason: `Opponents play this ${stats.count} times, you score ${((stats.wins / stats.count) * 100).toFixed(0)}%`,
          priority: 'medium'
        });
      });

    return recommendations;
  }, [openingRepertoireAnalysis, ratedGames]);

  // Goals and projections
  const goalProjections = useMemo(() => {
    const currentElo = playerInfo.current_elo;
    const eloGain = targetElo - currentElo;
    const today = new Date(2025, 10, 15); // Saturday Nov 15, 2025 (month is 0-indexed)
    const target = new Date(targetDate);
    const daysRemaining = Math.max(0, Math.ceil((target - today) / (1000 * 60 * 60 * 24)));
    const monthsRemaining = (daysRemaining / 30).toFixed(1);

    // Calculate ELO changes per tournament considering K-factor change
    const eloChanges = [];
    const lagoPueloIndex = tournamentOrder.indexOf("Abierto Lago Puelo");

    for (let i = 1; i < monthlyStats.length; i++) {
      const change = monthlyStats[i].elo - monthlyStats[i - 1].elo;
      // Weight recent tournaments (K=20) more than old ones (K=40)
      const weight = i >= lagoPueloIndex ? 1.0 : 0.5;
      eloChanges.push({ change, weight });
    }

    const totalWeight = eloChanges.reduce((sum, e) => sum + e.weight, 0);
    const avgEloPerTournament = totalWeight > 0 ?
      eloChanges.reduce((sum, e) => sum + (e.change * e.weight), 0) / totalWeight : 0;

    const tournamentsNeeded = avgEloPerTournament !== 0 ?
      Math.ceil(eloGain / avgEloPerTournament) : 0;

    // With K=20, calculate points needed
    // ELO gain = K * (actual_score - expected_score * games)
    // For next 9 games: actual_score = (desired_elo_gain / 20 + expected_score * 9)
    const avgOppRating = 1850; // Estimate based on recent tournaments
    const expectedScorePerGame = 1 / (1 + Math.pow(10, (avgOppRating - currentElo) / 400));
    const desiredGainPer9 = eloGain / tournamentsNeeded;
    const pointsNeeded = Math.max(0, Math.min(9, (desiredGainPer9 / 20) + (expectedScorePerGame * 9)));

    return {
      currentElo,
      targetElo,
      eloGain,
      daysRemaining,
      monthsRemaining,
      avgEloPerTournament: avgEloPerTournament.toFixed(1),
      tournamentsNeeded,
      pointsNeededPer9Games: pointsNeeded.toFixed(1),
      kFactor: 20,
      onTrack: avgEloPerTournament > 0 && tournamentsNeeded <= parseFloat(monthsRemaining),
      projectedElo: currentElo + (avgEloPerTournament * parseFloat(monthsRemaining))
    };
  }, [playerInfo.current_elo, targetElo, targetDate, monthlyStats, tournamentOrder]);

  const achievements = useMemo(() => {
    const badges = [];

    // Win streaks
    if (streaks.longestWin >= 3) {
      badges.push({ name: `${streaks.longestWin}-Game Win Streak`, icon: '🔥', earned: true });
    }

    // Beat higher rated
    const beatenHigher = ratedGames.filter(g => g.result === 'W' && g.opp_elo > g.elo + 100).length;
    if (beatenHigher >= 5) {
      badges.push({ name: `Giant Slayer (${beatenHigher} wins vs +100)`, icon: '⚔️', earned: true });
    }

    // Performance milestones
    if (overallStats.performanceRating >= 1900) {
      badges.push({ name: '1900+ Performance Rating', icon: '🎯', earned: true });
    }

    // Tournament success
    const tournamentWins = tournamentStats.filter(t => t.wins > t.losses).length;
    if (tournamentWins >= 3) {
      badges.push({ name: `${tournamentWins} Positive Tournaments`, icon: '🏆', earned: true });
    }

    // Opening mastery
    const masterOpenings = allOpeningsStats.filter(o => o.games >= 5 && o.winRate >= 60).length;
    if (masterOpenings >= 2) {
      badges.push({ name: `${masterOpenings} Mastered Openings (60%+ in 5+)`, icon: '📚', earned: true });
    }

    // Unbeaten streak
    if (streaks.longestUnbeaten >= 5) {
      badges.push({ name: `${streaks.longestUnbeaten}-Game Unbeaten Streak`, icon: '🛡️', earned: true });
    }

    return badges;
  }, [ratedGames, streaks, overallStats, tournamentStats, allOpeningsStats]);

  const nextMilestones = useMemo(() => {
    const milestones = [];

    // ELO milestones
    const nextEloMilestone = Math.ceil(playerInfo.current_elo / 50) * 50;
    milestones.push({
      title: `Reach ${nextEloMilestone} ELO`,
      current: playerInfo.current_elo,
      target: nextEloMilestone,
      progress: ((playerInfo.current_elo / nextEloMilestone) * 100).toFixed(1)
    });

    // Win rate milestone
    const currentWinRate = parseFloat(overallStats.winRate);
    const nextWinMilestone = Math.ceil(currentWinRate / 5) * 5;
    milestones.push({
      title: `${nextWinMilestone}% Win Rate`,
      current: currentWinRate.toFixed(1),
      target: nextWinMilestone,
      progress: ((currentWinRate / nextWinMilestone) * 100).toFixed(1)
    });

    // Games played milestone
    const nextGamesMilestone = Math.ceil(ratedGames.length / 10) * 10;
    milestones.push({
      title: `${nextGamesMilestone} Rated Games`,
      current: ratedGames.length,
      target: nextGamesMilestone,
      progress: ((ratedGames.length / nextGamesMilestone) * 100).toFixed(1)
    });

    return milestones;
  }, [playerInfo.current_elo, overallStats.winRate, ratedGames.length]);

  // Training plan helpers
  const getCurrentWeekPlan = () => {
    return weeklyPlans[currentWeek] || {};
  };

  const updateDayPlan = (date, activities) => {
    setWeeklyPlans(prev => ({
      ...prev,
      [currentWeek]: {
        ...prev[currentWeek],
        [date]: activities
      }
    }));
  };

  const updateDailyNote = (date, note) => {
    setDailyNotes(prev => ({
      ...prev,
      [date]: note
    }));
  };

  // Google Calendar export function
  const exportToGoogleCalendar = (date, dayPlan, note) => {
    if (dayPlan.length === 0) {
      alert('No activities planned for this day');
      return;
    }

    const dateObj = new Date(date);
    const title = `Chess Training - ${dayPlan.length} activities`;

    // Calculate total time
    const totalMinutes = dayPlan.reduce((sum, activity) => sum + (activity.minutes || 0), 0);

    // Build description
    let description = 'Chess Training Activities:\\n\\n';
    dayPlan.forEach((activity, idx) => {
      const activityDef = trainingActivities.find(a => a.id === activity.id);
      description += `${idx + 1}. ${activityDef?.label || activity.id}`;
      if (activity.minutes > 0) {
        description += ` (${activity.minutes} min)`;
      }
      if (activity.details) {
        description += ` - ${activity.details}`;
      }
      description += '\\n';
    });

    if (note) {
      description += `\\nNotes: ${note}`;
    }

    // Set default start time (9:00 AM on the selected date)
    const startTime = new Date(dateObj);
    startTime.setHours(9, 0, 0, 0);

    // End time based on total minutes or default 2 hours
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + (totalMinutes || 120));

    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
    const formatGoogleDate = (d) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startStr = formatGoogleDate(startTime);
    const endStr = formatGoogleDate(endTime);

    // Build Google Calendar URL
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: description,
      dates: `${startStr}/${endStr}`,
      location: 'Online/Home'
    });

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
    window.open(url, '_blank');
  };

  // PGN Import Parser
  const parsePGN = (pgnText) => {
    try {
      const games = [];
      const gameBlocks = pgnText.split(/\n\n(?=\[Event)/);

      gameBlocks.forEach(block => {
        if (!block.trim()) return;

        const game = {};
        const lines = block.split('\n');

        lines.forEach(line => {
          if (line.startsWith('[')) {
            const match = line.match(/\[(\w+)\s+"([^"]+)"\]/);
            if (match) {
              const [, key, value] = match;
              if (key === 'WhiteElo') game.whiteElo = parseInt(value);
              if (key === 'BlackElo') game.blackElo = parseInt(value);
              if (key === 'White') game.white = value;
              if (key === 'Black') game.black = value;
              if (key === 'Result') game.result = value;
              if (key === 'ECO') game.eco = value;
              if (key === 'Event') game.tournament = value;
            }
          }
        });

        if (game.white && game.black) {
          games.push(game);
        }
      });

      return games;
    } catch (error) {
      alert('Error parsing PGN: ' + error.message);
      return [];
    }
  };

  const handlePgnImport = () => {
    const parsedGames = parsePGN(pgnText);
    if (parsedGames.length === 0) {
      alert('No valid games found in PGN');
      return;
    }

    // Show preview/confirmation dialog
    const confirmImport = window.confirm(
      `Found ${parsedGames.length} games. This is a preview feature. ` +
      `Imported games would need to be manually added to the games array.`
    );

    if (confirmImport) {
      console.log('Parsed games:', parsedGames);
      alert(`Successfully parsed ${parsedGames.length} games. Check console for details.`);
      setPgnText('');
      setShowPgnImport(false);
    }
  };

  // Time of Day Analytics
  const timeOfDayStats = useMemo(() => {
    const timeSlots = {
      'Morning (9-12)': { games: [], wins: 0, draws: 0, losses: 0 },
      'Afternoon (13-17)': { games: [], wins: 0, draws: 0, losses: 0 },
      'Evening (18-20)': { games: [], wins: 0, draws: 0, losses: 0 }
    };

    games.forEach(game => {
      if (!game.time) return;

      const hour = parseInt(game.time.split(':')[0]);
      let slot;

      if (hour >= 9 && hour <= 12) slot = 'Morning (9-12)';
      else if (hour >= 13 && hour <= 17) slot = 'Afternoon (13-17)';
      else if (hour >= 18 && hour <= 20) slot = 'Evening (18-20)';

      if (slot && timeSlots[slot]) {
        timeSlots[slot].games.push(game);
        if (game.result === 'W') timeSlots[slot].wins++;
        else if (game.result === 'D') timeSlots[slot].draws++;
        else if (game.result === 'L') timeSlots[slot].losses++;
      }
    });

    return Object.entries(timeSlots).map(([time, data]) => ({
      time,
      total: data.games.length,
      wins: data.wins,
      draws: data.draws,
      losses: data.losses,
      score: data.games.length > 0 ? ((data.wins + data.draws * 0.5) / data.games.length * 100).toFixed(1) : 0,
      winRate: data.games.length > 0 ? ((data.wins / data.games.length) * 100).toFixed(1) : 0
    })).filter(slot => slot.total > 0);
  }, [games]);

  // Tournament Comparison Data
  const tournamentComparison = useMemo(() => {
    const tournamentEloChanges = {
      'Club Argentino de Ajedrez': +76,
      'Torre Blanca': +49,
      'Masters Ciudad': +72,
      'Abierto Madryn': +41,
      'Abierto Lago Puelo': -28
    };

    const tournamentPerformanceRatings = {
      'Club Argentino de Ajedrez': 1777,
      'Torre Blanca': 1787,
      'Masters Ciudad': 1950,
      'Abierto Madryn': 1956,
      'Abierto Lago Puelo': 1719
    };

    const ratedTournaments = games
      .filter(g => g.rated)
      .reduce((acc, game) => {
        if (!acc[game.tournament]) {
          acc[game.tournament] = [];
        }
        acc[game.tournament].push(game);
        return acc;
      }, {});

    return Object.entries(ratedTournaments).map(([name, tournamentGames]) => {
      const wins = tournamentGames.filter(g => g.result === 'W').length;
      const draws = tournamentGames.filter(g => g.result === 'D').length;
      const losses = tournamentGames.filter(g => g.result === 'L').length;
      const score = ((wins + draws * 0.5) / tournamentGames.length * 100).toFixed(1);

      const oppElos = tournamentGames.filter(g => g.opp_elo > 0).map(g => g.opp_elo);
      const avgOppElo = oppElos.length > 0
        ? Math.round(oppElos.reduce((a, b) => a + b, 0) / oppElos.length)
        : 0;

      const playerElo = tournamentGames[0]?.elo || 0;
      const eloChange = tournamentEloChanges[name] || 0;

      return {
        name,
        games: tournamentGames.length,
        wins,
        draws,
        losses,
        score: parseFloat(score),
        avgOppElo,
        playerElo,
        eloChange,
        performance: tournamentPerformanceRatings[name] || null
      };
    });
  }, [games]);

  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-slate-900">Lucas's Chess Performance Dashboard</h1>
              <p className="text-slate-600">Classical OTB Games Analysis</p>
            </div>

            {/* Game Source Filter */}
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm">
              <span className="text-sm font-medium text-slate-600">Show:</span>
              <button
                onClick={() => setGameFilter('otb')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${gameFilter === 'otb'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                OTB Only
                {gameFilter === 'otb' && (
                  <span className="ml-2 text-xs opacity-90">({filteredGames.length})</span>
                )}
              </button>
              <button
                onClick={() => setGameFilter('online')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${gameFilter === 'online'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                Online Only
                {gameFilter === 'online' && (
                  <span className="ml-2 text-xs opacity-90">({filteredGames.length})</span>
                )}
              </button>
              <button
                onClick={() => setGameFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${gameFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                All Games
                {gameFilter === 'all' && (
                  <span className="ml-2 text-xs opacity-90">({filteredGames.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 border-b border-slate-200">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'rating', label: 'ELO Progress' },
              { id: 'trends', label: 'Trends' },
              { id: 'tournaments', label: 'Tournaments' },
              { id: 'opponents', label: 'vs Opponents' },
              { id: 'opponent-strength', label: 'Opponent Strength' },
              { id: 'white', label: 'As White' },
              { id: 'black', label: 'As Black' },
              { id: 'openings', label: 'Openings' },
              { id: 'repertoire', label: 'Repertoire' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'training', label: 'Training Plan' },
              { id: 'goals', label: 'Goals' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? 'border-b-2 border-emerald-600 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <OverviewTab
            playerInfo={playerInfo}
            overallStats={overallStats}
            whiteStats={whiteStats}
            blackStats={blackStats}
            ratedGames={ratedGames}
            eloHistory={eloHistory}
            tournamentStats={tournamentStats}
            bestResults={bestResults}
            worstResults={worstResults}
            Trophy={Trophy}
            Swords={Swords}
            Target={Target}
            TrendingUp={TrendingUp}
          />
        )}

        {activeTab === 'rating' && (
          <RatingTab eloHistory={eloHistory} />
        )}

        {activeTab === 'rating-old' && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">ELO Progression</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={eloHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="game" label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }} />
                  <YAxis domain={[1400, 1950]} label={{ value: 'ELO', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 bg-white border border-gray-300 rounded shadow">
                            <p className="font-semibold">Game {data.game}</p>
                            <p className="text-sm text-gray-600">{data.tournament}</p>
                            <p className="text-sm">vs {data.opponent}</p>
                            <p className="text-sm text-gray-500">{data.opening}</p>
                            <p className="font-medium">ELO: {data.elo}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="elo" stroke="#3b82f6" strokeWidth={2} name="ELO" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Expected vs Actual Performance</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={eloHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="game" label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }} />
                  <YAxis domain={[0, 1]} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 bg-white border border-gray-300 rounded shadow">
                            <p className="font-semibold">Game {data.game}</p>
                            <p className="text-sm text-gray-500">{data.opening}</p>
                            <p className="text-sm">Expected: {data.expected.toFixed(2)}</p>
                            <p className="text-sm">Actual: {data.actual.toFixed(2)}</p>
                            <p className={`text-sm font-semibold ${data.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Diff: {data.diff > 0 ? '+' : ''}{data.diff.toFixed(2)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="expected" fill="#94a3b8" name="Expected" />
                  <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <TournamentsTab tournamentStats={tournamentStats} />
        )}

        {activeTab === 'opponents' && (
          <OpponentsTab
            selectedBracket={selectedBracket}
            setSelectedBracket={setSelectedBracket}
            opponentBracketStats={opponentBracketStats}
            bracketGames={bracketGames}
            ecoNames={ecoNames}
          />
        )}

        {activeTab === 'opponent-strength' && (
          <OpponentStrengthTab
            games={games}
            currentElo={playerInfo.current_elo}
          />
        )}

        {activeTab === 'white' && (
          <WhiteGamesTab
            whiteStats={whiteStats}
            whiteSortBy={whiteSortBy}
            setWhiteSortBy={setWhiteSortBy}
            whiteSortOrder={whiteSortOrder}
            setWhiteSortOrder={setWhiteSortOrder}
            games={games}
            ecoNames={ecoNames}
          />
        )}

        {activeTab === 'black' && (
          <BlackGamesTab
            blackStats={blackStats}
            blackSortBy={blackSortBy}
            setBlackSortBy={setBlackSortBy}
            blackSortOrder={blackSortOrder}
            setBlackSortOrder={setBlackSortOrder}
            games={games}
            ecoNames={ecoNames}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsTab
            formStats={formStats}
            streaks={streaks}
            monthlyStats={monthlyStats}
          />
        )}

        {activeTab === 'repertoire' && (
          <RepertoireTab
            openingRecommendations={openingRecommendations}
            openingRepertoireAnalysis={openingRepertoireAnalysis}
            mainRepertoire={mainRepertoire}
            setMainRepertoire={setMainRepertoire}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            showPgnImport={showPgnImport}
            setShowPgnImport={setShowPgnImport}
            pgnText={pgnText}
            setPgnText={setPgnText}
            handlePgnImport={handlePgnImport}
            timeOfDayStats={timeOfDayStats}
            tournamentComparison={tournamentComparison}
            LichessSyncPanel={LichessSyncPanel}
            onLichessSync={handleLichessSync}
          />
        )}

        {activeTab === 'training' && (
          <TrainingTab
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
            weeklyPlans={weeklyPlans}
            setWeeklyPlans={setWeeklyPlans}
            dailyNotes={dailyNotes}
            updateDailyNote={updateDailyNote}
            editingDay={editingDay}
            setEditingDay={setEditingDay}
            weeklyHours={weeklyHours}
            setWeeklyHours={setWeeklyHours}
            getCurrentWeekPlan={getCurrentWeekPlan}
            updateDayPlan={updateDayPlan}
            exportToGoogleCalendar={exportToGoogleCalendar}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsTab
            targetElo={targetElo}
            setTargetElo={setTargetElo}
            targetDate={targetDate}
            setTargetDate={setTargetDate}
            goalProjections={goalProjections}
            achievements={achievements}
            nextMilestones={nextMilestones}
          />
        )}

        {activeTab === 'openings' && (
          <OpeningsTab allOpeningsStats={allOpeningsStats} />
        )}
      </div>
    </div>
  );
};

export default ChessDashboard;
