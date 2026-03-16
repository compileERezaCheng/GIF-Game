export default function init(gameData) {
    const defaultThemes = ["Segunda-feira às 8h", "Gatos vs Tecnologia", "Expectativa vs Realidade"];

    return {
        login: (userId, name) => gameData.addPlayer(userId, name),
        
        startThemeVote: async (roomCode) => {
            const room = gameData.getRoom(roomCode);
            let pool = gameData.getThemeSuggestions(roomCode);
            if (pool.length < 2) pool = [...pool, ...defaultThemes.sort(() => 0.5 - Math.random()).slice(0, 2)];
            room.themeBallot = pool.sort(() => 0.5 - Math.random()).slice(0, 2);
            gameData.updateRoomStatus(roomCode, 'THEME_VOTING');
        },

        finishThemeVote: async (roomCode) => {
            const room = gameData.getRoom(roomCode);
            if (!room) return;
            const counts = {};
            room.themeBallot.forEach(t => counts[t] = 0);
            room.themeVotes.forEach(t => counts[t]++);
            
            const [tA, tB] = room.themeBallot;
            const vencedor = counts[tA] >= (counts[tB] || 0) ? tA : tB;
            
            room.currentTheme = vencedor;
            room.themePool.delete(vencedor); // Remover tema da lista para não repetir
            gameData.updateRoomStatus(roomCode, 'THEME_WINNER');
        },

        castThemeVote: async (userId, roomCode, theme) => {
            const room = gameData.getRoom(roomCode);
            if (room) room.themeVotes.set(userId, theme);
        },

        submitGif: async (userId, roomCode, url) => {
            const room = gameData.getRoom(roomCode);
            if (room) room.gifs.set(userId, { id: userId, url, playerId: userId, dono: gameData.getPlayer(userId)?.name });
        },

        castGifVote: async (userId, roomCode, gifId) => {
            const room = gameData.getRoom(roomCode);
            if (!room || userId === gifId) return; 
            room.votes.set(userId, gifId);
            const gifVotado = room.gifs.get(gifId);
            if (gifVotado) gameData.updatePlayerScore(gifVotado.playerId, 10);
        },

        advanceRound: async (roomCode) => {
            const room = gameData.getRoom(roomCode);
            // Previne o avanço da ronda se a sala não existir ou tiver retornado ao LOBBY
            if (!room || room.status === 'LOBBY') return;
            if (room.round < room.configs.rounds) {
                gameData.resetRoomRound(roomCode);
                room.round += 1;
                gameData.updateRoomStatus(roomCode, 'THEME_SUBMISSION');
            } else gameData.updateRoomStatus(roomCode, 'FINAL_RANKING');
        },

        obterResultadosGlobais: async (roomCode) => {
            const room = gameData.getRoom(roomCode);
            if (!room) return { winners: [] };
            const voteCounts = {};
            room.votes.forEach(id => voteCounts[id] = (voteCounts[id] || 0) + 1);
            let max = 0;
            Object.values(voteCounts).forEach(c => { if(c > max) max = c; });
            const winners = [];
            if (max > 0) {
                Object.entries(voteCounts).forEach(([id, count]) => {
                    if (count === max) {
                        const g = room.gifs.get(id);
                        winners.push({ url: g.url, dono: g.dono, votos: count });
                    }
                });
            }
            return { winners };
        }
    };
}