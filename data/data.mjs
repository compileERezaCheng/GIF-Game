import crypto from 'crypto';

export default function init() {
    const players = new Map();
    const rooms = new Map();

    return {
        addPlayer, getPlayer, getAllPlayers, getAllPlayersInRoom, updatePlayerScore,
        createRoom, getRoom, getAllRooms, joinRoom, leaveRoom, updateRoomStatus, updateRoomConfigs,
        addThemeSuggestion, getThemeSuggestions, resetRoomRound, softResetRoom, setPlayerOnline
    };

    function addPlayer(userId, name, pfp = null) {
        if (players.has(userId)) {
            const p = players.get(userId);
            p.name = name;
            return p;
        }
        const newPlayer = { id: userId, name, score: 0, roomId: null, pfp, online: true };
        players.set(userId, newPlayer);
        return newPlayer;
    }

    function setPlayerOnline(id, status) { if(players.has(id)) players.get(id).online = status; }
    function getPlayer(id) { return players.get(id); }
    function getAllPlayers() { return Array.from(players.values()); }
    function getAllRooms() { return Array.from(rooms.values()); }

    function getAllPlayersInRoom(code) {
        const room = rooms.get(code);
        if (!room) return [];
        return Array.from(room.playersIds).map(id => players.get(id));
    }

    function createRoom(hostId) {
        const code = crypto.randomBytes(3).toString('hex').toUpperCase();
        const room = {
            code, hostId, status: 'LOBBY', round: 1, currentTheme: null,
            themeBallot: [], themeVotes: new Map(), gifs: new Map(), votes: new Map(),
            playersIds: new Set([hostId]), themePool: new Set(), submittedPlayers: new Set(),
            timerExpiresAt: null, configs: { rounds: 3, suggestionTime: 1, submissionTime: 2 }
        };
        rooms.set(code, room);
        if (players.has(hostId)) players.get(hostId).roomId = code;
        return room;
    }

    function getRoom(code) { return rooms.get(code); }

    function joinRoom(id, code) {
        const room = rooms.get(code);
        if (room) { 
            room.playersIds.add(id); 
            const p = players.get(id);
            if(p) p.roomId = code;
        }
        return room;
    }

    function leaveRoom(id) {
        const p = players.get(id);
        if (!p?.roomId) return null;
        const code = p.roomId;
        const room = rooms.get(code);
        if (room) {
            room.playersIds.delete(id);
            p.roomId = null;
            if (String(room.hostId) === String(id)) {
                const rem = Array.from(room.playersIds);
                if (rem.length) room.hostId = rem[0]; else rooms.delete(code);
            }
            
            if (rooms.has(code) && room.playersIds.size < 2 && room.status !== 'LOBBY') {
                softResetRoom(code);
            }
        }
        return code;
    }

    function updateRoomConfigs(code, conf) {
        const r = rooms.get(code);
        if (r) {
            r.configs.rounds = parseInt(conf.rounds) || r.configs.rounds;
            r.configs.suggestionTime = parseInt(conf.suggestionTime) || r.configs.suggestionTime;
            r.configs.submissionTime = parseInt(conf.submissionTime) || r.configs.submissionTime;
        }
    }

    function updateRoomStatus(code, status) {
        const r = rooms.get(code);
        if (!r) return;
        r.status = status;
        const now = Date.now();
        // Timers are now the primary drivers of game flow
        if (status === 'THEME_SUBMISSION') r.timerExpiresAt = now + (r.configs.suggestionTime * 60000);
        else if (status === 'THEME_VOTING') r.timerExpiresAt = now + 30000;
        else if (status === 'THEME_WINNER') r.timerExpiresAt = now + 5000;
        else if (status === 'GIF_SUBMISSION') r.timerExpiresAt = now + (r.configs.submissionTime * 60000);
        else if (status === 'GIF_VOTING') r.timerExpiresAt = now + 45000;
        else if (status === 'RESULTS') r.timerExpiresAt = now + 15000;
        else r.timerExpiresAt = null;
    }

    function addThemeSuggestion(code, id, theme) {
        const r = rooms.get(code);
        if (r && theme) { r.themePool.add(theme.trim()); r.submittedPlayers.add(id); }
    }

    function getThemeSuggestions(code) { return Array.from(rooms.get(code)?.themePool || []); }

    function updatePlayerScore(id, pts) { if(players.has(id)) players.get(id).score += pts; }

    function resetRoomRound(code) {
        const r = rooms.get(code);
        if (r) {
            r.gifs.clear(); r.votes.clear(); r.themeVotes.clear();
            r.submittedPlayers.clear(); r.themeBallot = [];
            r.currentTheme = null; r.timerExpiresAt = null;
        }
    }

    function softResetRoom(code) {
        const r = rooms.get(code);
        if (r) {
            resetRoomRound(code);
            r.round = 1; r.status = 'LOBBY';
            r.playersIds.forEach(id => { if (players.has(id)) players.get(id).score = 0; });
        }
    }
}