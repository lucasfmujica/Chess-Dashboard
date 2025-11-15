import React, { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ArgentinaMap from './components/charts/ArgentinaMap';
import EloProgressionChart from './components/charts/EloProgressionChart';
import OpeningsPieChart from './components/charts/OpeningsPieChart';
import StatCard from './components/chess/StatCard';
import QuickTemplates from './components/chess/training/QuickTemplates';
import WeeklyPlanner from './components/chess/training/WeeklyPlanner';
import { Swords, Target, TrendingDown, TrendingUp, Trophy } from './components/icons/ChessIcons';
import { ecoNames } from './constants/ecoNames';
import { trainingActivities } from './constants/trainingActivities';
import { getCurrentWeekStart, getWeekDates, getWeekStats } from './utils/chessHelpers';

const ChessDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBracket, setSelectedBracket] = useState(null);
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

  const playerInfo = {
    current_elo: 1861,
    elo_change_last_tournament: -28,
    last_tournament: "Abierto Lago Puelo"
  };

  // Games ordered chronologically by tournament
  const games = [
    // Club Argentino de Ajedrez
    { "elo": 1651, "color": "B", "result": "W", "opp": "Vanesa Guzman", "opp_elo": 1756, "eco": "B30", "tournament": "Club Argentino de Ajedrez", "rated": true },
    { "elo": 1651, "color": "W", "result": "W", "opp": "Maximiliano Lalli", "opp_elo": 1691, "eco": "A37", "tournament": "Club Argentino de Ajedrez", "rated": true },
    { "elo": 1651, "color": "W", "result": "D", "opp": "Exequiel Medina", "opp_elo": 1858, "eco": "A15", "tournament": "Club Argentino de Ajedrez", "rated": true },
    { "elo": 1651, "color": "W", "result": "L", "opp": "Walter Montero", "opp_elo": 1884, "eco": "A20", "tournament": "Club Argentino de Ajedrez", "rated": true },
    { "elo": 1651, "color": "B", "result": "D", "opp": "Ezequiel Paredes", "opp_elo": 0, "eco": "B32", "tournament": "Club Argentino de Ajedrez", "rated": true },
    { "elo": 1651, "color": "W", "result": "W", "opp": "Marcelo Prieto", "opp_elo": 1902, "eco": "A25", "tournament": "Club Argentino de Ajedrez", "rated": true },
    { "elo": 1651, "color": "B", "result": "L", "opp": "Joaquin Rueda", "opp_elo": 1996, "eco": "B26", "tournament": "Club Argentino de Ajedrez", "rated": true },

    // Torre Blanca
    { "elo": 1651, "color": "W", "result": "W", "opp": "German Cisneros", "opp_elo": 1914, "eco": "A15", "tournament": "Torre Blanca", "rated": true },
    { "elo": 1651, "color": "B", "result": "W", "opp": "Daniel Federico", "opp_elo": 0, "eco": "B20", "tournament": "Torre Blanca", "rated": true },
    { "elo": 1651, "color": "W", "result": "L", "opp": "Raul Adrian Habiaga", "opp_elo": 1984, "eco": "A29", "tournament": "Torre Blanca", "rated": true },
    { "elo": 1651, "color": "B", "result": "D", "opp": "Marcelo Maucci", "opp_elo": 1768, "eco": "B37", "tournament": "Torre Blanca", "rated": true },
    { "elo": 1651, "color": "W", "result": "D", "opp": "Dario Moreno", "opp_elo": 1910, "eco": "A15", "tournament": "Torre Blanca", "rated": true },

    // Club Zugzwang (unrated)
    { "elo": 1651, "color": "B", "result": "W", "opp": "Maria Paula Arias", "opp_elo": 1736, "eco": "A70", "tournament": "Club Zugzwang", "rated": false },
    { "elo": 1651, "color": "W", "result": "L", "opp": "Anibal Borras", "opp_elo": 1731, "eco": "A15", "tournament": "Club Zugzwang", "rated": false },
    { "elo": 1651, "color": "W", "result": "W", "opp": "Gabriel Izak", "opp_elo": 2046, "eco": "A13", "tournament": "Club Zugzwang", "rated": false },
    { "elo": 1651, "color": "B", "result": "W", "opp": "Jesuan Letizia", "opp_elo": 1486, "eco": "A45", "tournament": "Club Zugzwang", "rated": false },
    { "elo": 1651, "color": "B", "result": "L", "opp": "Hugo Massenzana", "opp_elo": 2025, "eco": "A46", "tournament": "Club Zugzwang", "rated": false },
    { "elo": 1651, "color": "W", "result": "W", "opp": "Juan Vilches", "opp_elo": 1854, "eco": "A14", "tournament": "Club Zugzwang", "rated": false },

    // Masters Ciudad
    { "elo": 1776, "color": "W", "result": "W", "opp": "Enzo Alvarez", "opp_elo": 1899, "eco": "A29", "tournament": "Masters Ciudad", "rated": true },
    { "elo": 1776, "color": "W", "result": "W", "opp": "Thomas Castillo", "opp_elo": 1997, "eco": "A10", "tournament": "Masters Ciudad", "rated": true },
    { "elo": 1776, "color": "B", "result": "L", "opp": "Hernan Gastiaburo", "opp_elo": 2239, "eco": "E91", "tournament": "Masters Ciudad", "rated": true },
    { "elo": 1776, "color": "W", "result": "W", "opp": "Jorge Guelman", "opp_elo": 1576, "eco": "A15", "tournament": "Masters Ciudad", "rated": true },
    { "elo": 1776, "color": "W", "result": "D", "opp": "Agustín Meza Astrada", "opp_elo": 2077, "eco": "A13", "tournament": "Masters Ciudad", "rated": true },
    { "elo": 1776, "color": "B", "result": "L", "opp": "Federico Naspleda", "opp_elo": 2052, "eco": "B31", "tournament": "Masters Ciudad", "rated": true },
    { "elo": 1776, "color": "W", "result": "W", "opp": "Isaac Lainez Reyes", "opp_elo": 1890, "eco": "A30", "tournament": "Masters Ciudad", "rated": true },
    { "elo": 1776, "color": "B", "result": "L", "opp": "Facundo Simbler", "opp_elo": 1903, "eco": "B35", "tournament": "Masters Ciudad", "rated": true },
    { "elo": 1776, "color": "B", "result": "L", "opp": "José Zamudio", "opp_elo": 1921, "eco": "B21", "tournament": "Masters Ciudad", "rated": true },

    // Abierto Madryn
    { "elo": 1848, "color": "W", "result": "W", "opp": "Sergio Alonso", "opp_elo": 1754, "eco": "A20", "tournament": "Abierto Madryn", "rated": true },
    { "elo": 1848, "color": "B", "result": "D", "opp": "Teo Dante Cicciari", "opp_elo": 1972, "eco": "A05", "tournament": "Abierto Madryn", "rated": true },
    { "elo": 1848, "color": "B", "result": "L", "opp": "Martin Daneri", "opp_elo": 2011, "eco": "B23", "tournament": "Abierto Madryn", "rated": true },
    { "elo": 1848, "color": "W", "result": "W", "opp": "Jeremías De Los Santos", "opp_elo": 1791, "eco": "A20", "tournament": "Abierto Madryn", "rated": true },
    { "elo": 1486, "color": "B", "result": "W", "opp": "Carlos Gonzalez", "opp_elo": 1405, "eco": "B23", "tournament": "Abierto Madryn", "rated": true },
    { "elo": 1848, "color": "W", "result": "D", "opp": "Marzo Daniel Lucero", "opp_elo": 2051, "eco": "A15", "tournament": "Abierto Madryn", "rated": true },

    // Abierto Lago Puelo
    { "elo": 1889, "color": "B", "result": "W", "opp": "Pedro Bustos", "opp_elo": 1622, "eco": "B35", "tournament": "Abierto Lago Puelo", "rated": true },
    { "elo": 1889, "color": "W", "result": "D", "opp": "Dario Castiglioni", "opp_elo": 1783, "eco": "A13", "tournament": "Abierto Lago Puelo", "rated": true },
    { "elo": 1889, "color": "W", "result": "W", "opp": "Xavier Cugat", "opp_elo": 1710, "eco": "A10", "tournament": "Abierto Lago Puelo", "rated": true },
    { "elo": 1889, "color": "W", "result": "L", "opp": "Jonas Nahuelmir", "opp_elo": 1727, "eco": "A20", "tournament": "Abierto Lago Puelo", "rated": true },
    { "elo": 1889, "color": "W", "result": "D", "opp": "Aarón Pizarro Rozas", "opp_elo": 1601, "eco": "A13", "tournament": "Abierto Lago Puelo", "rated": true },
    { "elo": 1889, "color": "B", "result": "W", "opp": "Pablo Rugiero", "opp_elo": 1584, "eco": "A76", "tournament": "Abierto Lago Puelo", "rated": true },
    { "elo": 1889, "color": "B", "result": "L", "opp": "Eliseo Torres", "opp_elo": 1658, "eco": "A56", "tournament": "Abierto Lago Puelo", "rated": true }
  ];

  const ratedGames = useMemo(() => games.filter(g => g.rated), []);

  const tournamentOrder = ["Club Argentino de Ajedrez", "Torre Blanca", "Masters Ciudad", "Abierto Madryn", "Abierto Lago Puelo"];

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
      .map(tournament => {
        const stats = byTournament[tournament];
        const total = stats.games.length;
        const actualScore = stats.wins + stats.draws * 0.5;
        const ratedOpponents = stats.games.filter(g => g.opp_elo > 0);
        const avgOppElo = ratedOpponents.length > 0 ?
          Math.round(ratedOpponents.reduce((sum, g) => sum + g.opp_elo, 0) / ratedOpponents.length) : 0;

        const performanceRating = actualScore > 0 && actualScore < total && avgOppElo > 0 ?
          Math.round(avgOppElo + 400 * Math.log10(actualScore / (total - actualScore))) : avgOppElo;

        return {
          tournament,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          total,
          score: `${actualScore}/${total}`,
          performanceRating,
          avgOppElo
        };
      });
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

  const bestResults = useMemo(() => {
    return ratedGames
      .filter(g => g.opp_elo > 0)
      .map((game, idx) => {
        const ratingDiff = game.opp_elo - game.elo;
        const expectedScore = 1 / (1 + Math.pow(10, ratingDiff / 400));
        const actualScore = game.result === 'W' ? 1 : game.result === 'D' ? 0.5 : 0;
        const performance = actualScore - expectedScore;

        return {
          ...game,
          gameNumber: idx + 1,
          ratingDiff,
          performance,
          opening: ecoNames[game.eco] || game.eco
        };
      })
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 3);
  }, [ratedGames]);

  const worstResults = useMemo(() => {
    return ratedGames
      .filter(g => g.opp_elo > 0)
      .map((game, idx) => {
        const ratingDiff = game.opp_elo - game.elo;
        const expectedScore = 1 / (1 + Math.pow(10, ratingDiff / 400));
        const actualScore = game.result === 'W' ? 1 : game.result === 'D' ? 0.5 : 0;
        const performance = actualScore - expectedScore;

        return {
          ...game,
          gameNumber: idx + 1,
          ratingDiff,
          performance,
          opening: ecoNames[game.eco] || game.eco
        };
      })
      .sort((a, b) => a.performance - b.performance)
      .slice(0, 3);
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
        elo: tournamentGames[0].elo
      };
    });

    return Object.values(byMonth).sort((a, b) => a.order - b.order);
  }, [ratedGames]);

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

    // Performance needed for next tournament with K=20
    const avgTournamentGames = monthlyStats.length > 0 ?
      monthlyStats.reduce((sum, t) => sum + t.games, 0) / monthlyStats.length : 7;

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

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Lucas's Chess Performance Dashboard</h1>
          <p className="text-gray-600">Classical OTB Games Analysis</p>
        </div>

        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'rating', label: 'ELO Progress' },
              { id: 'trends', label: 'Trends' },
              { id: 'tournaments', label: 'Tournaments' },
              { id: 'opponents', label: 'vs Opponents' },
              { id: 'white', label: 'As White' },
              { id: 'black', label: 'As Black' },
              { id: 'openings', label: 'Openings' },
              { id: 'repertoire', label: 'Repertoire' },
              { id: 'training', label: 'Training Plan' },
              { id: 'goals', label: 'Goals' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <StatCard
                title="Current ELO"
                value={playerInfo.current_elo}
                subtitle={`${playerInfo.elo_change_last_tournament > 0 ? '+' : ''}${playerInfo.elo_change_last_tournament} last tournament`}
                icon={Trophy}
                trend={playerInfo.elo_change_last_tournament > 0 ? 'up' : 'down'}
              />
              <StatCard
                title="Total Games"
                value={overallStats.total}
                subtitle={`Win rate: ${overallStats.winRate}%`}
                icon={Swords}
              />
              <StatCard
                title="Performance Rating"
                value={overallStats.performanceRating}
                subtitle={`Score: ${overallStats.actualScore}/${overallStats.total}`}
                icon={Target}
                trend={overallStats.performanceRating > playerInfo.current_elo ? 'up' : 'down'}
              />
              <StatCard
                title="Expected vs Actual"
                value={overallStats.actualScore}
                subtitle={`Expected: ${overallStats.expectedScore}`}
                icon={TrendingUp}
                trend={parseFloat(overallStats.actualScore) > parseFloat(overallStats.expectedScore) ? 'up' : 'down'}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-4 text-lg font-semibold">Results Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Wins', value: overallStats.wins },
                        { name: 'Draws', value: overallStats.draws },
                        { name: 'Losses', value: overallStats.losses }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-4 text-lg font-semibold">Color Statistics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">White</span>
                      <span className="text-gray-600">{whiteStats.score} ({whiteStats.winRate}%)</span>
                    </div>
                    <div className="flex space-x-2 text-sm">
                      <div className="flex-1 p-2 text-center bg-green-100 rounded">
                        <div className="font-semibold text-green-700">{whiteStats.wins}</div>
                        <div className="text-green-600">Wins</div>
                      </div>
                      <div className="flex-1 p-2 text-center bg-yellow-100 rounded">
                        <div className="font-semibold text-yellow-700">{whiteStats.draws}</div>
                        <div className="text-yellow-600">Draws</div>
                      </div>
                      <div className="flex-1 p-2 text-center bg-red-100 rounded">
                        <div className="font-semibold text-red-700">{whiteStats.losses}</div>
                        <div className="text-red-600">Losses</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Black</span>
                      <span className="text-gray-600">{blackStats.score} ({blackStats.winRate}%)</span>
                    </div>
                    <div className="flex space-x-2 text-sm">
                      <div className="flex-1 p-2 text-center bg-green-100 rounded">
                        <div className="font-semibold text-green-700">{blackStats.wins}</div>
                        <div className="text-green-600">Wins</div>
                      </div>
                      <div className="flex-1 p-2 text-center bg-yellow-100 rounded">
                        <div className="font-semibold text-yellow-700">{blackStats.draws}</div>
                        <div className="text-yellow-600">Draws</div>
                      </div>
                      <div className="flex-1 p-2 text-center bg-red-100 rounded">
                        <div className="font-semibold text-red-700">{blackStats.losses}</div>
                        <div className="text-red-600">Losses</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Argentina Map */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Games by Province</h3>
              <ArgentinaMap games={ratedGames} />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="flex items-center mb-4 text-lg font-semibold">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  Best 3 Results
                </h3>
                <div className="space-y-3">
                  {bestResults.map((game, idx) => (
                    <div key={idx} className="p-3 border border-green-200 rounded-lg bg-green-50">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <span className="font-semibold text-gray-900">vs {game.opp}</span>
                          <span className="ml-2 text-sm text-gray-600">({game.opp_elo})</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${game.result === 'W' ? 'bg-green-600 text-white' :
                          game.result === 'D' ? 'bg-yellow-500 text-white' : 'bg-red-600 text-white'
                          }`}>
                          {game.result === 'W' ? 'Win' : game.result === 'D' ? 'Draw' : 'Loss'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>{game.opening} • {game.color === 'W' ? 'White' : 'Black'}</div>
                        <div className="mt-1">{game.tournament}</div>
                        <div className="mt-1 font-medium text-green-700">
                          Performance: +{game.performance.toFixed(2)}
                          {game.ratingDiff > 0 ? ` (vs +${game.ratingDiff})` : ` (vs ${game.ratingDiff})`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="flex items-center mb-4 text-lg font-semibold">
                  <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
                  Worst 3 Results
                </h3>
                <div className="space-y-3">
                  {worstResults.map((game, idx) => (
                    <div key={idx} className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <span className="font-semibold text-gray-900">vs {game.opp}</span>
                          <span className="ml-2 text-sm text-gray-600">({game.opp_elo})</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${game.result === 'W' ? 'bg-green-600 text-white' :
                          game.result === 'D' ? 'bg-yellow-500 text-white' : 'bg-red-600 text-white'
                          }`}>
                          {game.result === 'W' ? 'Win' : game.result === 'D' ? 'Draw' : 'Loss'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>{game.opening} • {game.color === 'W' ? 'White' : 'Black'}</div>
                        <div className="mt-1">{game.tournament}</div>
                        <div className="mt-1 font-medium text-red-700">
                          Performance: {game.performance.toFixed(2)}
                          {game.ratingDiff > 0 ? ` (vs +${game.ratingDiff})` : ` (vs ${game.ratingDiff})`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rating' && (
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
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Tournament Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Tournament</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Avg Opp</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tournamentStats.map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.tournament}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">{t.total}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{t.score}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">
                          <span className="text-green-600">{t.wins}</span>-
                          <span className="text-yellow-600">{t.draws}</span>-
                          <span className="text-red-600">{t.losses}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">{t.avgOppElo}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-center text-blue-600">{t.performanceRating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Performance Rating by Tournament</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tournamentStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[1600, 2100]} />
                  <YAxis type="category" dataKey="tournament" width={150} />
                  <Tooltip />
                  <Bar dataKey="performanceRating" fill="#3b82f6" name="Performance Rating" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'opponents' && (
          <div className="space-y-6">
            {selectedBracket && (
              <div className="p-6 bg-white rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Games vs {selectedBracket === 'lower' ? 'Lower Rated' : selectedBracket === 'similar' ? 'Similar Rated' : 'Higher Rated'} Opponents
                  </h3>
                  <button
                    onClick={() => setSelectedBracket(null)}
                    className="px-4 py-2 text-sm font-medium transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Back to Overview
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Game</th>
                        <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Opponent</th>
                        <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">ELO</th>
                        <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">Diff</th>
                        <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">Color</th>
                        <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Opening</th>
                        <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">Result</th>
                        <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Tournament</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bracketGames.map((game, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">#{game.gameNumber}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{game.opp}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">{game.opp_elo}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`font-medium ${game.ratingDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {game.ratingDiff > 0 ? '+' : ''}{game.ratingDiff}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${game.color === 'W' ? 'bg-gray-100 text-gray-800' : 'bg-gray-800 text-white'
                              }`}>
                              {game.color === 'W' ? 'White' : 'Black'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div>{game.opening}</div>
                            <div className="text-xs text-gray-400">{game.eco}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${game.result === 'W' ? 'bg-green-600 text-white' :
                              game.result === 'D' ? 'bg-yellow-500 text-white' : 'bg-red-600 text-white'
                              }`}>
                              {game.result === 'W' ? 'Win' : game.result === 'D' ? 'Draw' : 'Loss'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{game.tournament}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!selectedBracket && (
              <>
                <div className="p-6 bg-white rounded-lg shadow-md">
                  <h3 className="mb-4 text-lg font-semibold">Performance by Opponent Rating</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Bracket</th>
                          <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                          <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                          <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                          <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Win Rate</th>
                          <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {opponentBracketStats.map((bracket, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{bracket.bracket}</td>
                            <td className="px-6 py-4 text-sm text-center text-gray-700">{bracket.total}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{bracket.score}</td>
                            <td className="px-6 py-4 text-sm text-center text-gray-700">
                              <span className="text-green-600">{bracket.wins}</span>-
                              <span className="text-yellow-600">{bracket.draws}</span>-
                              <span className="text-red-600">{bracket.losses}</span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-center text-blue-600">{bracket.winRate}%</td>
                            <td className="px-6 py-4 text-sm text-center">
                              <button
                                onClick={() => setSelectedBracket(idx === 0 ? 'lower' : idx === 1 ? 'similar' : 'higher')}
                                className="px-3 py-1 text-xs font-medium text-white transition-colors bg-blue-600 rounded hover:bg-blue-700"
                              >
                                View Games
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-6 bg-white rounded-lg shadow-md">
                  <h3 className="mb-4 text-lg font-semibold">Results by Opponent Bracket</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={opponentBracketStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bracket" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="wins" stackId="a" fill="#10b981" name="Wins" />
                      <Bar dataKey="draws" stackId="a" fill="#f59e0b" name="Draws" />
                      <Bar dataKey="losses" stackId="a" fill="#ef4444" name="Losses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'white' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <StatCard
                title="Games as White"
                value={whiteStats.total}
                subtitle={`Win rate: ${whiteStats.winRate}%`}
              />
              <StatCard
                title="Score"
                value={whiteStats.score}
                subtitle={`${whiteStats.wins}W ${whiteStats.draws}D ${whiteStats.losses}L`}
              />
              <StatCard
                title="Performance Rating"
                value={whiteStats.performanceRating}
              />
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Results Distribution as White</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: whiteStats.wins },
                      { name: 'Draws', value: whiteStats.draws },
                      { name: 'Losses', value: whiteStats.losses }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Openings as White</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Opening</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {whiteStats.openings.map((opening, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{opening.name}</div>
                          <div className="text-xs text-gray-500">{opening.eco}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">{opening.games}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">
                          <span className="text-green-600">{opening.wins}</span>-
                          <span className="text-yellow-600">{opening.draws}</span>-
                          <span className="text-red-600">{opening.losses}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{opening.score}</td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className={`font-semibold ${parseFloat(opening.winRate) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                            {opening.winRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'black' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <StatCard
                title="Games as Black"
                value={blackStats.total}
                subtitle={`Win rate: ${blackStats.winRate}%`}
              />
              <StatCard
                title="Score"
                value={blackStats.score}
                subtitle={`${blackStats.wins}W ${blackStats.draws}D ${blackStats.losses}L`}
              />
              <StatCard
                title="Performance Rating"
                value={blackStats.performanceRating}
              />
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Results Distribution as Black</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: blackStats.wins },
                      { name: 'Draws', value: blackStats.draws },
                      { name: 'Losses', value: blackStats.losses }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Openings as Black</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Opening</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {blackStats.openings.map((opening, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{opening.name}</div>
                          <div className="text-xs text-gray-500">{opening.eco}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">{opening.games}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">
                          <span className="text-green-600">{opening.wins}</span>-
                          <span className="text-yellow-600">{opening.draws}</span>-
                          <span className="text-red-600">{opening.losses}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{opening.score}</td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className={`font-semibold ${parseFloat(opening.winRate) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                            {opening.winRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-3 text-lg font-semibold">Current Form</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Last 5 Games</p>
                    <p className="text-2xl font-bold text-blue-600">{formStats.last5.score}</p>
                    <p className="text-sm text-gray-500">{formStats.last5.percentage}%</p>
                    <div className="flex gap-1 mt-2">
                      {formStats.last5.details.map((result, idx) => (
                        <div
                          key={idx}
                          className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-xs ${result === 'W' ? 'bg-green-600' : result === 'D' ? 'bg-yellow-500' : 'bg-red-600'
                            }`}
                        >
                          {result}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last 10 Games</p>
                    <p className="text-2xl font-bold text-blue-600">{formStats.last10.score}</p>
                    <p className="text-sm text-gray-500">{formStats.last10.percentage}%</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-3 text-lg font-semibold">Current Streak</h3>
                <div className="text-center">
                  <div className={`text-5xl font-bold mb-2 ${streaks.current.type === 'win' ? 'text-green-600' :
                    streaks.current.type === 'loss' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                    {streaks.current.count}
                  </div>
                  <p className="text-gray-600 capitalize">
                    {streaks.current.type === 'win' ? 'Win Streak' :
                      streaks.current.type === 'loss' ? 'Loss Streak' : 'Unbeaten Streak'}
                  </p>
                </div>
                <div className="pt-4 mt-4 space-y-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Longest Win Streak</span>
                    <span className="font-semibold">{streaks.longestWin} games</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Longest Unbeaten</span>
                    <span className="font-semibold">{streaks.longestUnbeaten} games</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-3 text-lg font-semibold">Performance Trend</h3>
                <div className="space-y-2">
                  {monthlyStats.slice(-3).map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{stat.tournament.split(' ')[0]}</p>
                        <p className="text-xs text-gray-500">{stat.games} games</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-600">{stat.performanceRating}</p>
                        <p className="text-xs text-gray-500">{stat.winRate}% wins</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Tournament-by-Tournament Performance</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tournament" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" label={{ value: 'Win Rate %', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Performance', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="winRate" stroke="#10b981" strokeWidth={2} name="Win Rate %" />
                  <Line yAxisId="right" type="monotone" dataKey="performanceRating" stroke="#3b82f6" strokeWidth={2} name="Performance" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">ELO Progression Over Tournaments</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tournament" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[1600, 1950]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="elo" stroke="#8b5cf6" strokeWidth={3} name="ELO" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'repertoire' && (
          <div className="space-y-6">
            <div className="p-6 border border-blue-200 rounded-lg shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="flex items-center mb-4 text-lg font-semibold">
                <span className="mr-2 text-2xl">💡</span>
                Opening Recommendations
              </h3>
              {openingRecommendations.length > 0 ? (
                <div className="space-y-3">
                  {openingRecommendations.map((rec, idx) => (
                    <div key={idx} className={`p-4 rounded-lg ${rec.priority === 'high' ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'
                      }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{rec.opening}</p>
                          <p className="text-sm text-gray-600">{rec.eco}</p>
                          <p className="mt-1 text-sm">{rec.reason}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rec.priority === 'high' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                          }`}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No critical issues found. Your opening repertoire looks solid!</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-4 text-lg font-semibold">White Repertoire</h3>
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-600">Main openings (click to toggle):</p>
                  <div className="flex flex-wrap gap-2">
                    {openingRepertoireAnalysis.white.slice(0, 8).map((opening, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const newRepertoire = { ...mainRepertoire };
                          if (newRepertoire.white.includes(opening.eco)) {
                            newRepertoire.white = newRepertoire.white.filter(e => e !== opening.eco);
                          } else {
                            newRepertoire.white.push(opening.eco);
                          }
                          setMainRepertoire(newRepertoire);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${opening.isMain
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {opening.eco}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-xs font-medium text-left text-gray-500">Opening</th>
                        <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Games</th>
                        <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Score</th>
                        <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {openingRepertoireAnalysis.white.map((opening, idx) => (
                        <tr key={idx} className={opening.isMain ? 'bg-blue-50' : ''}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{opening.name}</div>
                            <div className="text-xs text-gray-500">{opening.eco}</div>
                          </td>
                          <td className="px-3 py-2 text-center">{opening.games}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-semibold ${opening.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                              {opening.winRate}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {opening.needsWork ? (
                              <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                                Needs Work
                              </span>
                            ) : opening.isMain ? (
                              <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                                Main
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                                Backup
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-4 text-lg font-semibold">Black Repertoire</h3>
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-600">Main defenses (click to toggle):</p>
                  <div className="flex flex-wrap gap-2">
                    {openingRepertoireAnalysis.black.slice(0, 8).map((opening, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const newRepertoire = { ...mainRepertoire };
                          if (newRepertoire.black.includes(opening.eco)) {
                            newRepertoire.black = newRepertoire.black.filter(e => e !== opening.eco);
                          } else {
                            newRepertoire.black.push(opening.eco);
                          }
                          setMainRepertoire(newRepertoire);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${opening.isMain
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {opening.eco}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-xs font-medium text-left text-gray-500">Opening</th>
                        <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Games</th>
                        <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Score</th>
                        <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {openingRepertoireAnalysis.black.map((opening, idx) => (
                        <tr key={idx} className={opening.isMain ? 'bg-gray-100' : ''}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{opening.name}</div>
                            <div className="text-xs text-gray-500">{opening.eco}</div>
                          </td>
                          <td className="px-3 py-2 text-center">{opening.games}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-semibold ${opening.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                              {opening.winRate}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {opening.needsWork ? (
                              <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                                Needs Work
                              </span>
                            ) : opening.isMain ? (
                              <span className="px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded">
                                Main
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                                Backup
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="space-y-6">
            {/* Week Navigator */}
            <div className="p-6 border border-indigo-200 rounded-lg shadow-md bg-gradient-to-r from-indigo-50 to-blue-50">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    const prev = new Date(currentWeek);
                    prev.setDate(prev.getDate() - 7);
                    setCurrentWeek(prev.toISOString().split('T')[0]);
                  }}
                  className="px-4 py-2 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ← Previous Week
                </button>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900">Week of {new Date(currentWeek).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                  <p className="mt-1 text-sm text-gray-600">As GM Noah Studer advises: Plan 6 days, rest 1 day</p>
                </div>
                <button
                  onClick={() => {
                    const next = new Date(currentWeek);
                    next.setDate(next.getDate() + 7);
                    setCurrentWeek(next.toISOString().split('T')[0]);
                  }}
                  className="px-4 py-2 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Next Week →
                </button>
              </div>

              {/* Week Stats */}
              <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4">
                {(() => {
                  const stats = getWeekStats(weeklyPlans, currentWeek);
                  return (
                    <>
                      <div className="p-3 text-center bg-white rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{stats.totalPlannedMinutes}</p>
                        <p className="text-xs text-gray-600">Total Minutes</p>
                      </div>
                      <div className="p-3 text-center bg-white rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{stats.daysPlanned}</p>
                        <p className="text-xs text-gray-600">Days Planned</p>
                      </div>
                      <div className="p-3 text-center bg-white rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{stats.avgMinutesPerDay}</p>
                        <p className="text-xs text-gray-600">Avg Min/Day</p>
                      </div>
                      <div className="p-3 text-center bg-white rounded-lg">
                        <p className="text-2xl font-bold text-gray-600">{stats.restDays}</p>
                        <p className="text-xs text-gray-600">Rest Days</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Weekly Planner Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {getWeekDates(currentWeek).map(({ day, date, displayDate }) => {
                const dayPlan = getCurrentWeekPlan()[date] || [];
                const note = dailyNotes[date] || '';
                const isToday = date === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={date}
                    className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${isToday ? 'border-blue-500' : 'border-gray-200'
                      }`}
                  >
                    {/* Day Header */}
                    <div className={`p-4 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900">{day}</h4>
                          <p className="text-sm text-gray-600">{displayDate}</p>
                        </div>
                        {isToday && (
                          <span className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded">
                            Today
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="p-4 space-y-2 min-h-[200px]">
                      {dayPlan.length === 0 ? (
                        <div className="py-8 text-center text-gray-400">
                          <p className="text-sm">No activities planned</p>
                        </div>
                      ) : (
                        dayPlan.map((activity, idx) => {
                          const activityDef = trainingActivities.find(a => a.id === activity.id);
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border-2 border-${activityDef?.color}-200 bg-${activityDef?.color}-50`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{activityDef?.label}</p>
                                  {activity.minutes > 0 && (
                                    <p className="mt-1 text-xs text-gray-600">{activity.minutes} minutes</p>
                                  )}
                                  {activity.details && (
                                    <p className="mt-1 text-xs text-gray-500">{activity.details}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    const newPlan = dayPlan.filter((_, i) => i !== idx);
                                    updateDayPlan(date, newPlan);
                                  }}
                                  className="ml-2 text-gray-400 hover:text-red-600"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Add Activity Button */}
                    <div className="p-4 border-t bg-gray-50">
                      <button
                        onClick={() => setEditingDay(editingDay === date ? null : date)}
                        className="w-full px-3 py-2 text-sm font-medium text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700"
                      >
                        {editingDay === date ? 'Close' : '+ Add Activity'}
                      </button>

                      {/* Activity Picker */}
                      {editingDay === date && (
                        <div className="mt-3 space-y-2 overflow-y-auto max-h-64">
                          {trainingActivities.map(activity => (
                            <button
                              key={activity.id}
                              onClick={() => {
                                const newActivity = {
                                  id: activity.id,
                                  minutes: activity.defaultMinutes,
                                  details: ''
                                };
                                updateDayPlan(date, [...dayPlan, newActivity]);
                                setEditingDay(null);
                              }}
                              className="w-full px-3 py-2 text-sm text-left transition-colors bg-white border border-gray-200 rounded hover:border-indigo-300 hover:bg-indigo-50"
                            >
                              {activity.label}
                              {activity.defaultMinutes > 0 && (
                                <span className="ml-2 text-xs text-gray-500">({activity.defaultMinutes} min)</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Daily Note */}
                      <div className="mt-3">
                        <textarea
                          value={note}
                          onChange={(e) => updateDailyNote(date, e.target.value)}
                          placeholder="Daily notes..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Templates */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Quick Templates</h3>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Weekly Study Hours
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">hours/week ({Math.round(weeklyHours * 60 / 6)} min/day)</span>
              </div>
              <p className="mb-4 text-sm text-gray-600">Following GM Noah's advice: 1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames/Openings/Strategy (this week: Endgames)</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <button
                  onClick={() => {
                    const dates = getWeekDates(currentWeek);
                    const totalMinutes = weeklyHours * 60;
                    const dailyMinutes = Math.round(totalMinutes / 6); // 6 active days
                    const newPlan = {};
                    dates.forEach(({ date }, idx) => {
                      if (idx === 6) { // Sunday - rest day
                        newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
                      } else {
                        // 1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames (this week's focus)
                        const cycle = idx % 3;
                        if (cycle === 0) {
                          newPlan[date] = [{ id: 'tactics', minutes: dailyMinutes, details: 'Tactical puzzles and pattern recognition' }];
                        } else if (cycle === 1) {
                          const playTime = Math.round(dailyMinutes * 0.5);
                          const analysisTime = dailyMinutes - playTime;
                          newPlan[date] = [
                            { id: 'games', minutes: playTime, details: 'Play rated games with focus, no distractions' },
                            { id: 'analysis', minutes: analysisTime, details: 'Deep analysis of games played' }
                          ];
                        } else {
                          newPlan[date] = [{ id: 'endgame', minutes: dailyMinutes, details: 'Endgame study and practice' }];
                        }
                      }
                    });
                    setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
                  }}
                  className="p-4 transition-colors border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50"
                >
                  <p className="font-semibold text-blue-900">⚡ Noah's Method</p>
                  <p className="mt-1 text-xs text-gray-600">1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames</p>
                </button>

                <button
                  onClick={() => {
                    const dates = getWeekDates(currentWeek);
                    const totalMinutes = weeklyHours * 60;
                    const dailyMinutes = Math.round(totalMinutes / 6); // 6 active days
                    const tacticsTime = Math.round(dailyMinutes / 3);
                    const gamesTime = Math.round(dailyMinutes / 2);
                    const endgameTime = dailyMinutes - tacticsTime - gamesTime;
                    const newPlan = {};
                    dates.forEach(({ date }, idx) => {
                      if (idx === 6) { // Sunday
                        newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
                      } else {
                        newPlan[date] = [
                          { id: 'tactics', minutes: tacticsTime, details: '' },
                          { id: 'games', minutes: gamesTime, details: '' },
                          { id: 'endgame', minutes: endgameTime, details: '' }
                        ];
                      }
                    });
                    setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
                  }}
                  className="p-4 transition-colors border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50"
                >
                  <p className="font-semibold text-green-900">🎯 Balanced Daily</p>
                  <p className="mt-1 text-xs text-gray-600">All three elements every day</p>
                </button>

                <button
                  onClick={() => {
                    const dates = getWeekDates(currentWeek);
                    const totalMinutes = weeklyHours * 60;
                    const tacticsDaily = Math.round(totalMinutes / 3 / 3); // 1/3 of total, spread over 3 days
                    const playAnalyzeDaily = Math.round(totalMinutes / 3 / 2); // 1/3 of total, spread over 2 days
                    const endgameDaily = Math.round(totalMinutes / 3); // 1/3 of total on 1 day
                    const newPlan = {};
                    dates.forEach(({ date }, idx) => {
                      if (idx === 6) { // Sunday
                        newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
                      } else if (idx <= 2) {
                        // First 3 days: Tactics focus
                        newPlan[date] = [{ id: 'tactics', minutes: tacticsDaily, details: 'Intensive tactical training' }];
                      } else if (idx === 3 || idx === 4) {
                        // Next 2 days: Play and analyze
                        const playTime = Math.round(playAnalyzeDaily * 0.67);
                        const analysisTime = playAnalyzeDaily - playTime;
                        newPlan[date] = [
                          { id: 'games', minutes: playTime, details: 'Multiple rated games' },
                          { id: 'analysis', minutes: analysisTime, details: 'Deep game review' }
                        ];
                      } else {
                        // Saturday: Endgames
                        newPlan[date] = [{ id: 'endgame', minutes: endgameDaily, details: 'Deep endgame study' }];
                      }
                    });
                    setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
                  }}
                  className="p-4 transition-colors border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50"
                >
                  <p className="font-semibold text-purple-900">📚 Block Focus</p>
                  <p className="mt-1 text-xs text-gray-600">Multi-day blocks: Tactics → Play → Endgames</p>
                </button>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    if (window.confirm('Clear this week\'s plan?')) {
                      setWeeklyPlans(prev => {
                        const newPlans = { ...prev };
                        delete newPlans[currentWeek];
                        return newPlans;
                      });
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-700 transition-colors bg-red-100 rounded-lg hover:bg-red-200"
                >
                  Clear Week
                </button>
              </div>
            </div>

            {/* Notes Section */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">📝 Week Summary & Reflections</h3>
              <textarea
                value={dailyNotes[`${currentWeek}-summary`] || ''}
                onChange={(e) => updateDailyNote(`${currentWeek}-summary`, e.target.value)}
                placeholder="How did this week go? What worked well? What needs improvement for next week?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows="6"
              />
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="p-6 border border-purple-200 rounded-lg shadow-md bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="mb-4 text-lg font-semibold">Set Your Goal</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Target ELO</label>
                  <input
                    type="number"
                    value={targetElo}
                    onChange={(e) => setTargetElo(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-2 text-sm font-medium text-gray-600">ELO Needed</h3>
                <p className={`text-4xl font-bold ${goalProjections.eloGain > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                  {goalProjections.eloGain > 0 ? '+' : ''}{goalProjections.eloGain}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {goalProjections.currentElo} → {goalProjections.targetElo}
                </p>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-2 text-sm font-medium text-gray-600">Time Remaining</h3>
                <p className="text-4xl font-bold text-purple-600">{goalProjections.monthsRemaining}</p>
                <p className="mt-1 text-sm text-gray-500">months ({goalProjections.daysRemaining} days)</p>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-2 text-sm font-medium text-gray-600">Status</h3>
                <div className={`text-3xl font-bold ${goalProjections.onTrack ? 'text-green-600' : 'text-orange-600'}`}>
                  {goalProjections.onTrack ? '✓ On Track' : '⚠ Challenging'}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Projection Analysis</h3>
              <p className="mb-4 text-sm text-gray-600">Current K-factor: {goalProjections.kFactor} (changed from K=40 after Abierto Lago Puelo)</p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-gray-600">Current ELO</span>
                    <span className="font-semibold">{goalProjections.currentElo}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-gray-600">Average Gain per Tournament</span>
                    <span className="font-semibold">{goalProjections.avgEloPerTournament}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-gray-600">Tournaments Needed</span>
                    <span className="font-semibold">{goalProjections.tournamentsNeeded}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-gray-600">Projected ELO (at current pace)</span>
                    <span className={`font-semibold ${goalProjections.projectedElo >= targetElo ? 'text-green-600' : 'text-orange-600'}`}>
                      {Math.round(goalProjections.projectedElo)}
                    </span>
                  </div>
                </div>

                <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                  <h4 className="mb-3 font-semibold">Next Tournament Target</h4>
                  <p className="mb-4 text-sm text-gray-700">
                    To stay on track for your goal, aim for approximately:
                  </p>
                  <div className="p-4 text-center bg-white rounded-lg">
                    <p className="text-4xl font-bold text-blue-600">{goalProjections.pointsNeededPer9Games}</p>
                    <p className="mt-2 text-sm text-gray-600">points out of 9 games</p>
                    <p className="mt-1 text-xs text-gray-500">
                      (e.g., 6W-0D-3L or 5W-3D-1L)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Achievement Badges</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {achievements.map((badge, idx) => (
                  <div key={idx} className="p-4 text-center border-2 border-yellow-300 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50">
                    <div className="mb-2 text-4xl">{badge.icon}</div>
                    <p className="text-sm font-semibold text-gray-900">{badge.name}</p>
                  </div>
                ))}
              </div>
              {achievements.length === 0 && (
                <p className="py-8 text-center text-gray-500">Keep playing to earn badges!</p>
              )}
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Next Milestones</h3>
              <div className="space-y-4">
                {nextMilestones.map((milestone, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-gray-900">{milestone.title}</span>
                      <span className="text-sm text-gray-600">{milestone.current} / {milestone.target}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full">
                      <div
                        className="h-3 transition-all rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${Math.min(100, milestone.progress)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{milestone.progress}% complete</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'openings' && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Most Played Openings</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={allOpeningsStats.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={180} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 bg-white border border-gray-300 rounded shadow">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-xs text-gray-500">{data.eco}</p>
                            <p className="text-sm">Games: {data.games}</p>
                            <p className="text-sm">Score: {data.score}</p>
                            <p className="text-sm">White: {data.asWhite} | Black: {data.asBlack}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="games" fill="#3b82f6" name="Games Played" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Win Rate by Opening (ECO Code)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Opening</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Win Rate</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">As White</th>
                      <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">As Black</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allOpeningsStats.map((opening, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{opening.name}</div>
                          <div className="text-xs text-gray-500">{opening.eco}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">{opening.games}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">
                          <span className="text-green-600">{opening.wins}</span>-
                          <span className="text-yellow-600">{opening.draws}</span>-
                          <span className="text-red-600">{opening.losses}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{opening.score}</td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className={`font-semibold ${opening.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                            {opening.winRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">{opening.asWhite}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">{opening.asBlack}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Opening Success Rate Comparison</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={allOpeningsStats.filter(o => o.games >= 2)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={180} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 bg-white border border-gray-300 rounded shadow">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-xs text-gray-500">{data.eco}</p>
                            <p className="text-sm">Win Rate: {data.winRate}%</p>
                            <p className="text-sm">Games: {data.games}</p>
                            <p className="text-sm">Score: {data.score}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="winRate" fill="#10b981" name="Win Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessDashboard;
