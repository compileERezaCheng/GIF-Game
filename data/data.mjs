import crypto from 'crypto';

export default function init() {
    const players = new Map(); 
    const themeSuggestions = new Set(); 
    const game = {
        status: 'waiting',
        round: 1,
        currentTheme: null,
        themeBallot: [], 
        themeVotes: new Map(), 
        gifs: new Map(),  
        votes: new Map()  
    };

    return {
        addPlayer, removePlayer, getPlayer, getAllPlayers, updatePlayerScore,
        updateGameState, getGameState, setTheme, addThemeSuggestion, getThemeSuggestions,
        setThemeBallot, castThemeVote, getThemeVotes,
        addGif, updateGif, getGifByPlayer, getAllGifs,
        setVote, getAllVotes, resetRound, fullReset
    };

    function addPlayer(socketId, name) {
        const newPlayer = { id: socketId, name, score: 0 };
        players.set(socketId, newPlayer);
        return newPlayer;
    }

    function updatePlayerScore(playerId, points) {
        const player = players.get(playerId);
        if (player) player.score += points;
    }

    function removePlayer(socketId) {
        const p = players.get(socketId);
        players.delete(socketId);
        return p;
    }

    function getPlayer(id) { return players.get(id); }
    function getAllPlayers() { return Array.from(players.values()); }
    
    function getGameState() { 
        return {
            ...game,
            themePool: Array.from(themeSuggestions),
            themeVotesCount: game.themeVotes.size,
            gifsCount: game.gifs.size
        }; 
    }

    function updateGameState(s) { game.status = s; return getGameState(); }
    function setTheme(t) { game.currentTheme = t; }
    function setThemeBallot(temas) { game.themeBallot = temas; }
    function castThemeVote(pId, tema) { game.themeVotes.set(pId, tema); }
    function getThemeVotes() { return Array.from(game.themeVotes.entries()); }
    function addThemeSuggestion(t) { themeSuggestions.add(t); }
    function getThemeSuggestions() { return Array.from(themeSuggestions); }
    
    function addGif(playerId, url) {
        const id = crypto.randomUUID(); 
        const newGif = { id, playerId, url };
        game.gifs.set(id, newGif);
        return newGif;
    }

    function updateGif(gifId, url) {
        const g = game.gifs.get(gifId);
        if (g) g.url = url;
        return g;
    }

    function getGifByPlayer(pId) { 
        return Array.from(game.gifs.values()).find(g => g.playerId === pId); 
    }

    function getAllGifs() { return Array.from(game.gifs.values()); }
    function setVote(pId, gId) { game.votes.set(pId, gId); }
    function getAllVotes() { return Array.from(game.votes.entries()); }

    function resetRound() {
        game.gifs.clear();
        game.votes.clear();
        game.themeVotes.clear();
        game.themeBallot = [];
        game.currentTheme = null;
        game.round += 1; 
        game.status = 'waiting'; 
        return getGameState();
    }

    function fullReset() {
        game.gifs.clear();
        game.votes.clear();
        game.themeVotes.clear();
        game.themeBallot = [];
        game.currentTheme = null;
        game.round = 1;
        game.status = 'waiting';
        players.forEach(p => p.score = 0);
        return getGameState();
    }
}