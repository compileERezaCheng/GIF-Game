import { v4 as uuidv4 } from 'uuid';

export default function init(gameServices, gameData, io) {
    const pfpList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    return { setupRoutes, sessionMiddleware };

    function sessionMiddleware(req, res, next) {
        if (!req.cookies.userId) {
            res.cookie('userId', uuidv4(), { maxAge: 900000, httpOnly: true });
        }
        next();
    }

    function broadcastSync(roomCode, type = 'state_update') {
        if (io && roomCode) {
            const players = gameData.getAllPlayersInRoom(roomCode);
            io.to(roomCode).emit('room_sync', { type, players });
        }
    }

    function setupRoutes(app) {
        
        // --- NAVEGAÇÃO PRINCIPAL ---
        app.get('/', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);

            if (!player) return res.render('login-view');
            if (!player.pfp) return res.redirect('/choose-icon');
            if (!player.roomId) return res.render('lobby-choice-view', { player });

            const room = gameData.getRoom(player.roomId);
            if (!room) { player.roomId = null; return res.redirect('/'); }

            const isHost = String(room.hostId) === String(userId);
            const timeLeft = room.timerExpiresAt ? Math.max(0, Math.ceil((room.timerExpiresAt - Date.now()) / 1000)) : 0;

            const viewData = { 
                player, room, isHost, 
                players: gameData.getAllPlayersInRoom(room.code), 
                timeLeft, 
                theme: room.currentTheme 
            };

            switch(room.status) {
                case 'LOBBY': return res.render('room-view', viewData);
                case 'THEME_SUBMISSION': 
                    return res.render(room.submittedPlayers.has(userId) ? 'theme-waiting-view' : 'theme-submit-view', viewData);
                case 'THEME_VOTING': 
                    if (room.themeVotes.has(userId)) return res.render('theme-waiting-vote-view', viewData);
                    return res.render('theme-vote-view', { ...viewData, ballot: room.themeBallot });
                case 'THEME_WINNER': return res.render('theme-winner-view', viewData);
                case 'GIF_SUBMISSION': 
                    return res.render(room.gifs.has(userId) ? 'gif-waiting-view' : 'gif-submit-view', viewData);
                case 'GIF_VOTING':
                    if (room.votes.has(userId)) return res.render('gif-waiting-vote-view', viewData);
                    return res.render('gif-vote-view', { ...viewData, gifs: Array.from(room.gifs.values()) });
                case 'RESULTS':
                    const results = await gameServices.obterResultadosGlobais(room.code);
                    return res.render('results-view', { ...viewData, results });
                case 'FINAL_RANKING':
                    const podium = gameData.getAllPlayersInRoom(room.code).sort((a, b) => b.score - a.score);
                    return res.render('final-podium-view', { ...viewData, podium });
                default: return res.render('login-view');
            }
        });

        // --- GESTÃO DE ENTRADA (O QUE ESTAVA A FALTAR) ---
        app.post('/login', (req, res) => {
            const name = req.body.name;
            if (name) {
                gameData.addPlayer(req.cookies.userId, name);
                return res.redirect('/choose-icon');
            }
            res.redirect('/');
        });

        // --- PERFIL E ICONES ---
        app.get('/profile', (req, res) => {
            const player = gameData.getPlayer(req.cookies.userId);
            if (!player) return res.redirect('/');
            res.render('user-profile-view', { player });
        });

        app.get('/choose-icon', (req, res) => {
            const player = gameData.getPlayer(req.cookies.userId);
            if (!player) return res.redirect('/');
            res.render('icon-choice-view', { player, pfpList, fromProfile: req.query.from === 'profile' });
        });

        app.post('/profile/update', (req, res) => {
            const player = gameData.getPlayer(req.cookies.userId);
            if (player) {
                if (req.body.name) player.name = req.body.name;
                if (req.body.pfp) player.pfp = req.body.pfp;
                if (player.roomId) broadcastSync(player.roomId, 'player_update');
            }
            res.redirect(req.body.redirect || '/');
        });

        // --- GESTÃO DE SALAS ---
        app.get('/room/create', (req, res) => res.render('room-create-view'));
        app.get('/room/join', (req, res) => res.render('room-join-view', { error: req.query.error }));

        app.post('/room/create', (req, res) => {
            const room = gameData.createRoom(req.cookies.userId);
            gameData.updateRoomConfigs(room.code, req.body);
            res.redirect('/');
        });

        app.post('/room/join', (req, res) => {
            const code = req.body.code.toUpperCase();
            const room = gameData.getRoom(code);
            if (!room) return res.redirect('/room/join?error=Código inválido');
            
            // Validação de nome duplicado na sala
            const currentPlayer = gameData.getPlayer(req.cookies.userId);
            const playersInRoom = gameData.getAllPlayersInRoom(code);
            if (playersInRoom.some(p => p.name.toLowerCase() === currentPlayer.name.toLowerCase() && p.id !== currentPlayer.id)) {
                return res.redirect('/room/join?error=Nome já em uso nesta sala');
            }

            gameData.joinRoom(req.cookies.userId, code);
            broadcastSync(code, 'player_update');
            res.redirect('/');
        });

        app.post('/room/leave', (req, res) => {
            const userId = req.cookies.userId;
            const code = gameData.leaveRoom(userId);
            if (code) {
                broadcastSync(code, 'state_update'); 
            }
            res.redirect('/');
        });

        // --- AÇÕES DE JOGO ---
        app.post('/game/start', async (req, res) => {
            const player = gameData.getPlayer(req.cookies.userId);
            if (player?.roomId) {
                gameData.updateRoomConfigs(player.roomId, req.body);
                gameData.updateRoomStatus(player.roomId, 'THEME_SUBMISSION');
                broadcastSync(player.roomId, 'state_update');
            }
            res.redirect('/');
        });

        app.post('/theme/submit', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                gameData.addThemeSuggestion(player.roomId, userId, req.body.tema);
                const room = gameData.getRoom(player.roomId);
                if (room.submittedPlayers.size >= room.playersIds.size) {
                    await gameServices.startThemeVote(room.code);
                    broadcastSync(room.code, 'state_update');
                }
                res.redirect('/');
            }
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

        app.post('/gif/start-phase', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                const room = gameData.getRoom(player.roomId);
                if (room.timerExpiresAt && (Date.now() + 1000) < room.timerExpiresAt) return res.status(403).json({success: false});
                if (String(room.hostId) === String(userId)) {
                    gameData.updateRoomStatus(room.code, 'GIF_SUBMISSION');
                    broadcastSync(room.code, 'state_update');
                    return res.json({ success: true });
                }
            }
            res.json({ success: false });
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

        app.post('/game/next-round', async (req, res) => {
            const userId = req.cookies.userId;
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                const room = gameData.getRoom(player.roomId);
                if (room.timerExpiresAt && (Date.now() + 1000) < room.timerExpiresAt) return res.status(403).json({success: false});
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