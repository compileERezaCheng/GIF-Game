export default function init(gameData) {
    const defaultThemes = [
        "Segunda-feira às 8h", 
        "Gatos vs Tecnologia", 
        "Expectativa vs Realidade", 
        "Café matinal no escritório", 
        "Programadores a encontrar um bug"
    ];

    return {
        login: (userId, name) => gameData.addPlayer(userId, name),
        
        startThemeVote: async (roomCode) => {
            const room = gameData.getRoom(roomCode);
            let pool = gameData.getThemeSuggestions(roomCode);
            // Se houver poucos temas, adiciona os default
            if (pool.length < 2) {
                const shuffled = [...defaultThemes].sort(() => 0.5 - Math.random());
                pool = [...pool, ...shuffled.slice(0, 2)];
            }
            room.themeBallot = pool.sort(() => 0.5 - Math.random()).slice(0, 2);
            gameData.updateRoomStatus(roomCode, 'THEME_VOTING');
        },

        castThemeVote: async (userId, roomCode, theme) => {
            const room = gameData.getRoom(roomCode);
            if (room) room.themeVotes.set(userId, theme);
        },

        finishThemeVote: async (roomCode) => {
            const room = gameData.getRoom(roomCode);
            if (!room) return;
            const counts = {};
            room.themeBallot.forEach(t => counts[t] = 0);
            room.themeVotes.forEach(t => { if(counts[t] !== undefined) counts[t]++; });
            
            const [tA, tB] = room.themeBallot;
            let vencedor = counts[tA] >= (counts[tB] || 0) ? tA : tB;
            if (counts[tA] === counts[tB]) vencedor = Math.random() > 0.5 ? tA : tB;
            
            room.currentTheme = vencedor;
            gameData.updateRoomStatus(roomCode, 'THEME_WINNER');
        },

        submitGif: async (userId, roomCode, url) => {
            const room = gameData.getRoom(roomCode);
            if (!room) return;
            room.gifs.set(userId, { 
                id: userId, 
                url, 
                playerId: userId, 
                dono: gameData.getPlayer(userId)?.name || "Guerreiro" 
            });
        },

        castGifVote: async (userId, roomCode, gifId) => {
            const room = gameData.getRoom(roomCode);
            // Bloqueio de auto-voto: gifId aqui é o ID do dono do GIF (que é o userId)
            if (!room || userId === gifId) return; 
            
            room.votes.set(userId, gifId);
            const gifVotado = room.gifs.get(gifId);
            if (gifVotado) gameData.updatePlayerScore(gifVotado.playerId, 10);
        },

        advanceRound: async (roomCode) => {
            const room = gameData.getRoom(roomCode);
            if (!room) return;
            if (room.round < room.configs.rounds) {
                gameData.resetRoomRound(roomCode);
                room.round += 1;
                gameData.updateRoomStatus(roomCode, 'THEME_SUBMISSION');
            } else {
                gameData.updateRoomStatus(roomCode, 'FINAL_RANKING');
            }
        },

        obterResultadosGlobais: async (roomCode) => {
            const room = gameData.getRoom(roomCode);
            if (!room) return { winners: [] };
            const voteCounts = {};
            room.votes.forEach(gifId => { voteCounts[gifId] = (voteCounts[gifId] || 0) + 1; });
            
            let max = 0;
            for (const c of Object.values(voteCounts)) if (c > max) max = c;
            
            const winners = [];
            if (max > 0) {
                for (const [id, count] of Object.entries(voteCounts)) {
                    if (count === max) {
                        const g = room.gifs.get(id);
                        winners.push({ url: g.url, dono: g.dono, votos: count });
                    }
                }
            }
            return { winners };
        }
    };
}