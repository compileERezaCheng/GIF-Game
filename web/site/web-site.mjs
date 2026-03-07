import { v4 as uuidv4 } from 'uuid';

/**
 * Roteador Principal do Website
 * Gerencia o fluxo entre as rondas e a persistência de dados no ecrã.
 */
export default function init(gameServices, gameData, io) {
    
    return { setupRoutes, sessionMiddleware };

    function sessionMiddleware(req, res, next) {
        if (!req.cookies.userId) {
            res.cookie('userId', uuidv4(), { maxAge: 900000, httpOnly: true });
        }
        next();
    }

    /**
     * Sincroniza todos os jogadores na mesma sala.
     */
    function broadcastSync(roomCode, type = 'state_update') {
        if (io && roomCode) {
            const players = gameData.getAllPlayersInRoom(roomCode);
            io.to(roomCode).emit('room_sync', { type, players });
        }
    }

    function setupRoutes(app) {
        
        app.get('/', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);

            if (!player) return res.render('login-view');
            if (!player.roomId) return res.render('lobby-choice-view', { player });

            const room = gameData.getRoom(player.roomId);
            if (!room) { player.roomId = null; return res.redirect('/'); }

            const isHost = String(room.hostId) === String(userId);
            const playersInRoom = gameData.getAllPlayersInRoom(room.code);
            const timeLeft = room.timerExpiresAt ? Math.max(0, Math.floor((room.timerExpiresAt - Date.now()) / 1000)) : 0;
            
            // Obtemos a pool de temas acumulada para mostrar ou usar na lógica
            const themePool = gameData.getThemeSuggestions(room.code);

            // Dados globais para as Views
            const viewData = { 
                player, 
                room, 
                isHost, 
                players: playersInRoom, 
                timeLeft, 
                theme: room.currentTheme,
                themePool // Adicionado para persistência visual se necessário
            };

            switch(room.status) {
                case 'LOBBY': 
                    return res.render('room-view', viewData);
                
                case 'THEME_SUBMISSION': 
                    // Se o jogador já submeteu nesta ronda, vai para a espera
                    if (room.submittedPlayers.has(userId)) {
                        return res.render('theme-waiting-view', viewData);
                    }
                    return res.render('theme-submit-view', viewData);
                
                case 'THEME_VOTING': 
                    if (room.themeVotes.has(userId)) {
                        return res.render('theme-waiting-vote-view', viewData);
                    }
                    return res.render('theme-vote-view', { ...viewData, ballot: room.themeBallot });
                
                case 'THEME_WINNER': 
                    return res.render('theme-winner-view', viewData);
                
                case 'GIF_SUBMISSION': 
                    if (room.gifs.has(userId)) {
                        return res.render('gif-waiting-view', viewData);
                    }
                    return res.render('gif-submit-view', viewData);
                
                case 'GIF_VOTING':
                    if (room.votes.has(userId)) return res.render('gif-waiting-vote-view', viewData);
                    return res.render('gif-vote-view', { ...viewData, gifs: Array.from(room.gifs.values()) });
                
                case 'RESULTS':
                    const roundRes = await gameServices.obterResultadosGlobais(room.code);
                    return res.render('results-view', { ...viewData, results: roundRes });
                
                case 'FINAL_RANKING':
                    const podium = [...playersInRoom].sort((a, b) => b.score - a.score);
                    return res.render('final-podium-view', { ...viewData, podium });
                
                default: 
                    return res.render('login-view');
            }
        });

        // --- SALAS ---
        app.get('/room/create', (req, res) => res.render('room-create-view'));
        app.get('/room/join', (req, res) => res.render('room-join-view', { error: req.query.error }));

        app.post('/login', (req, res) => {
            gameData.addPlayer(req.cookies.userId, req.body.name);
            res.redirect('/');
        });

        app.post('/room/create', (req, res) => {
            const room = gameData.createRoom(req.cookies.userId);
            gameData.updateRoomConfigs(room.code, req.body);
            res.redirect('/');
        });

        app.post('/room/join', (req, res) => {
            const code = req.body.code.toUpperCase();
            const room = gameData.getRoom(code);
            if (!room) return res.redirect('/room/join?error=Código inválido');
            
            const currentPlayer = gameData.getPlayer(req.cookies.userId);
            const playersInRoom = gameData.getAllPlayersInRoom(code);
            if (playersInRoom.some(p => p.name.toLowerCase() === currentPlayer.name.toLowerCase() && p.id !== currentPlayer.id)) {
                return res.redirect('/room/join?error=Nome já em uso nesta sala');
            }

            gameData.joinRoom(req.cookies.userId, code);
            broadcastSync(code, 'player_update');
            res.redirect('/');
        });

        app.post('/game/start', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            const room = gameData.getRoom(player?.roomId);
            if (room && String(room.hostId) === String(userId)) {
                gameData.updateRoomConfigs(room.code, req.body);
                gameData.updateRoomStatus(room.code, 'THEME_SUBMISSION');
                broadcastSync(room.code, 'state_update');
            }
            res.redirect('/');
        });

        // --- LÓGICA DE TEMAS (CONTROLO DE NOVOS TEMAS) ---
        app.post('/theme/submit', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                // Adiciona a nova sugestão ao banco (themePool) e marca jogador como tendo submetido nesta ronda
                gameData.addThemeSuggestion(player.roomId, userId, req.body.tema);
                const room = gameData.getRoom(player.roomId);
                
                // Se todos submeteram NOVO tema, avança para a votação
                if (room.submittedPlayers.size >= room.playersIds.size) {
                    await gameServices.startThemeVote(room.code);
                    broadcastSync(room.code, 'state_update');
                }
                res.redirect('/');
            }
        });

        // Unificação de rotas de fim de tempo para evitar o erro de "0s"
        app.post('/theme/auto-finish', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                const room = gameData.getRoom(player.roomId);
                if (String(room.hostId) === String(userId)) {
                    await gameServices.startThemeVote(room.code);
                    broadcastSync(room.code, 'state_update');
                }
            }
            res.json({ success: true });
        });

        // Suporte para o nome de rota usado em alguns templates legados
        app.post('/theme/vote/start', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                const room = gameData.getRoom(player.roomId);
                if (String(room.hostId) === String(userId)) {
                    await gameServices.startThemeVote(room.code);
                    broadcastSync(room.code, 'state_update');
                }
            }
            res.json({ success: true });
        });

        app.post('/theme/vote', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                await gameServices.castThemeVote(userId, player.roomId, req.body.tema);
                const room = gameData.getRoom(player.roomId);
                if (room.themeVotes.size >= room.playersIds.size) {
                    await gameServices.finishThemeVote(room.code);
                    broadcastSync(room.code, 'state_update');
                }
                res.redirect('/');
            }
        });

        // --- GIFS ---
        app.post('/gif/start-phase', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                const room = gameData.getRoom(player.roomId);
                if (String(room.hostId) === String(userId)) {
                    gameData.updateRoomStatus(room.code, 'GIF_SUBMISSION');
                    broadcastSync(room.code, 'state_update');
                }
            }
            res.json({ success: true });
        });

        app.post('/gif/submit', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                await gameServices.submitGif(userId, player.roomId, req.body.url);
                const room = gameData.getRoom(player.roomId);
                if (room.gifs.size >= room.playersIds.size) {
                    gameData.updateRoomStatus(room.code, 'GIF_VOTING');
                    broadcastSync(room.code, 'state_update');
                }
                res.redirect('/');
            }
        });

        app.post('/gif/auto-finish', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                const room = gameData.getRoom(player.roomId);
                if (String(room.hostId) === String(userId)) {
                    gameData.updateRoomStatus(room.code, 'GIF_VOTING');
                    broadcastSync(room.code, 'state_update');
                }
            }
            res.json({ success: true });
        });

        app.post('/gif/vote', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                await gameServices.castGifVote(userId, player.roomId, req.body.gifId);
                const room = gameData.getRoom(player.roomId);
                if (room.votes.size >= room.playersIds.size) {
                    gameData.updateRoomStatus(room.code, 'RESULTS');
                    broadcastSync(room.code, 'state_update');
                }
                res.redirect('/');
            }
        });

        // --- RONDA E RESTART ---
        app.post('/game/next-round', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                const room = gameData.getRoom(player.roomId);
                if (String(room.hostId) === String(userId)) {
                    await gameServices.advanceRound(room.code);
                    broadcastSync(room.code, 'state_update');
                }
            }
            res.json({ success: true });
        });

        app.post('/game/restart', (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                const room = gameData.getRoom(player.roomId);
                if (String(room.hostId) === String(userId)) {
                    gameData.softResetRoom(room.code);
                    broadcastSync(room.code, 'state_update');
                }
            }
            res.redirect('/');
        });
    }
}