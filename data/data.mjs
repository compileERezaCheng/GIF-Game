import crypto from 'crypto';

export default function init() {
    const players = new Map(); 
    const game = {
        status: 'waiting',
        round: 1,
        gifs: new Map(),  
        votes: new Map()  
    };

    return {
        addPlayer, removePlayer, getPlayer, getAllPlayers,
        updateGameState, getGameState,
        addGif, updateGif, getGifByPlayer, getAllGifs,
        setVote, getAllVotes, resetRound
    };

    function addPlayer(socketId, name = "Anónimo") {
        const newPlayer = { id: socketId, name: name, score: 0 };
        players.set(socketId, newPlayer);
        return newPlayer;
    }

    function removePlayer(socketId) {
        const player = players.get(socketId);
        if (player) players.delete(socketId);
        return player; 
    }

    function getPlayer(socketId) { return players.get(socketId); }
    function getAllPlayers() { return Array.from(players.values()); }

    function updateGameState(newStatus) {
        game.status = newStatus;
        return game;
    }
    function getGameState() { return game; }

    function addGif(playerId, url) {
        const id = crypto.randomUUID(); 
        const newGif = { id, playerId, url };
        game.gifs.set(id, newGif);
        return newGif;
    }

    function updateGif(gifId, url) {
        const gif = game.gifs.get(gifId);
        if (gif) gif.url = url;
        return gif;
    }

    function getGifByPlayer(playerId) { 
        return Array.from(game.gifs.values()).find(g => g.playerId === playerId); 
    }

    function getAllGifs() { return Array.from(game.gifs.values()); }
    function setVote(playerId, gifId) { game.votes.set(playerId, gifId); }
    function getAllVotes() { return Array.from(game.votes.entries()); }

    function resetRound() {
        game.gifs.clear();
        game.votes.clear();
        game.round += 1;
        game.status = 'playing';
        return game;
    }
}