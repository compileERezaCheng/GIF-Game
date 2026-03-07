import crypto from 'crypto';

export default function init() {
    const players = new Map();
    const rooms = new Map();

    return {
        addPlayer, getPlayer, getAllPlayers, getAllPlayersInRoom, updatePlayerScore,
        createRoom, getRoom, joinRoom, updateRoomStatus, updateRoomConfigs,
        addThemeSuggestion, getThemeSuggestions, resetRoomRound, fullReset, softResetRoom
    };

    function addPlayer(userId, name) {
        if (players.has(userId)) {
            players.get(userId).name = name;
            return players.get(userId);
        }
        const newPlayer = { id: userId, name, score: 0, roomId: null };
        players.set(userId, newPlayer);
        return newPlayer;
    }

    function getPlayer(id) { return players.get(id); }
    function getAllPlayers() { return Array.from(players.values()); }

    function getAllPlayersInRoom(code) {
        const room = rooms.get(code);
        if (!room) return [];
        return Array.from(room.playersIds).map(id => players.get(id));
    }

    function createRoom(hostId) {
        let code;
        do {
            code = Math.random().toString(36).substring(2, 8).toUpperCase();
        } while (rooms.has(code));

        const room = {
            code,
            hostId,
            status: 'LOBBY',
            round: 1,
            currentTheme: null,
            themeBallot: [],
            themeVotes: new Map(),
            gifs: new Map(),
            votes: new Map(),
            playersIds: new Set([hostId]),
            themePool: new Set(),
            submittedPlayers: new Set(),
            timerExpiresAt: null,
            configs: { rounds: 3, suggestionTime: 1, submissionTime: 2 }
        };

        rooms.set(code, room);
        if (players.has(hostId)) players.get(hostId).roomId = code;
        return room;
    }

    function joinRoom(userId, code) {
        const room = rooms.get(code);
        if (!room) return null;
        room.playersIds.add(userId);
        if (players.has(userId)) players.get(userId).roomId = code;
        return room;
    }

    function getRoom(code) { return rooms.get(code); }

    function updateRoomConfigs(code, configs) {
        const room = rooms.get(code);
        if (room) {
            room.configs.rounds = parseInt(configs.rounds) || room.configs.rounds;
            room.configs.suggestionTime = parseInt(configs.suggestionTime) || room.configs.suggestionTime;
            room.configs.submissionTime = parseInt(configs.submissionTime) || room.configs.submissionTime;
        }
    }

    function updateRoomStatus(code, status) {
        const room = rooms.get(code);
        if (!room) return;

        room.status = status;
        const now = Date.now();

        // DEFINIÇÃO DE TIMESTAMPS REAIS (MS)
        switch(status) {
            case 'THEME_SUBMISSION':
                room.timerExpiresAt = now + (room.configs.suggestionTime * 60 * 1000);
                break;
            case 'THEME_WINNER':
                room.timerExpiresAt = now + 5000; // 5 segundos fixos
                break;
            case 'GIF_SUBMISSION':
                room.timerExpiresAt = now + (room.configs.submissionTime * 60 * 1000);
                break;
            case 'RESULTS':
                room.timerExpiresAt = now + 15000; // 15 segundos fixos
                break;
            default:
                room.timerExpiresAt = null;
        }
    }

    function addThemeSuggestion(code, userId, theme) {
        const room = rooms.get(code);
        if (room && theme) {
            room.themePool.add(theme.trim());
            room.submittedPlayers.add(userId);
        }
    }

    function getThemeSuggestions(code) {
        const room = rooms.get(code);
        return room ? Array.from(room.themePool) : [];
    }

    function updatePlayerScore(userId, pts) {
        const p = players.get(userId);
        if (p) p.score += pts;
    }

    function resetRoomRound(code) {
        const room = rooms.get(code);
        if (room) {
            room.gifs.clear();
            room.votes.clear();
            room.themeVotes.clear();
            room.submittedPlayers.clear();
            room.themeBallot = [];
            room.currentTheme = null;
            room.timerExpiresAt = null;
        }
    }

    function softResetRoom(code) {
        const room = rooms.get(code);
        if (room) {
            resetRoomRound(code);
            room.round = 1;
            room.status = 'LOBBY';
            room.themePool.clear();
            room.playersIds.forEach(id => {
                if (players.has(id)) players.get(id).score = 0;
            });
        }
    }

    function fullReset() {
        rooms.clear();
        players.forEach(p => { p.score = 0; p.roomId = null; });
        return { success: true };
    }
}