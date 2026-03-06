export default function init(gameServices, gameData) {
    if (!gameServices) throw new Error("gameServices is required");

    return {
        setupSockets,
        setupRestRoutes
    };

    // ======================================================
    // ==================== WEBSOCKETS ======================
    // ======================================================
    function setupSockets(io) {
        io.on('connection', (socket) => {
            console.log('⚡ Novo telemóvel ligado. ID do socket:', socket.id);

            // 1. Entrada de Jogador
            socket.on('join_game', (playerName) => {
                const result = gameServices.handlePlayerJoin(socket.id, playerName);
                if (result.error) {
                    socket.emit('game_error', result.error);
                } else {
                    io.emit('update_players', result.allPlayers);
                    console.log(`👤 ${playerName} entrou na festa!`);
                }
            });

            // 2. Iniciar Jogo (Muda para fase de escolha de tema)
            socket.on('start_game', () => {
                const result = gameServices.startGame();
                if (result.error) {
                    socket.emit('game_error', result.error);
                } else {
                    io.emit('game_started', result.gameState);
                }
            });

            // 3. Escolher Tema Oficial (Admin/Pick)
            socket.on('pick_theme', (theme) => {
                const result = gameServices.escolherTema(theme);
                if (result.error) {
                    socket.emit('game_error', result.error);
                } else {
                    io.emit('theme_selected', result.tema);
                }
            });

            // 4. Submeter GIF
            socket.on('submit_gif', (gifUrl) => {
                const result = gameServices.adicionarGif(socket.id, gifUrl);
                if (result.error) {
                    socket.emit('game_error', result.error);
                } else {
                    socket.emit('gif_accepted');
                    const totalGifs = gameServices.obterGifs().length;
                    io.emit('gif_count_updated', totalGifs);
                }
            });

            // 5. Desconexão
            socket.on('disconnect', () => {
                const result = gameServices.handlePlayerLeave(socket.id);
                if (result.removedPlayer) {
                    io.emit('update_players', result.allPlayers);
                }
            });
        });
    }

    // ======================================================
    // ================== ROTAS REST (API) ==================
    // ======================================================
    function setupRestRoutes(app) {
        
        // --- ESTADO E JOGADORES ---
        app.get('/api/game', (req, res) => res.json(gameData.getGameState()));
        
        app.get('/api/players', (req, res) => {
            const jogadores = gameServices.obterTodosOsJogadores();
            res.json({ total: jogadores.length, jogadores });
        });

        // --- SISTEMA DE TEMAS ---
        // Ver sugestões enviadas pelos utilizadores
        app.get('/api/themes/suggestions', (req, res) => {
            res.json(gameServices.obterSugestoes());
        });

        // Enviar uma nova sugestão (para a aba de sugestões do site)
        app.post('/api/themes/suggest', (req, res) => {
            const { tema } = req.body;
            res.json(gameServices.sugerirTema(tema));
        });

        // Escolher o tema que vai ser jogado nesta ronda
        app.post('/api/themes/pick', (req, res) => {
            const { tema } = req.body;
            res.json(gameServices.escolherTema(tema));
        });

        // --- GIFS E VOTOS ---
        app.get('/api/gifs', (req, res) => res.json(gameServices.obterGifs()));

        app.post('/api/gifs', (req, res) => {
            const { playerId, url } = req.body;
            res.json(gameServices.adicionarGif(playerId, url));
        });

        app.post('/api/votes', (req, res) => {
            const { playerId, gifId } = req.body;
            res.json(gameServices.votar(playerId, gifId));
        });

        // --- RESULTADOS E PONTUAÇÃO ---
        // Tabela detalhada da ronda (quem votou em quem)
        app.get('/api/results', (req, res) => {
            res.json(gameServices.obterResultadosGlobais());
        });

        // Ranking Geral por Pontos (Leaderboard)
        app.get('/api/leaderboard', (req, res) => {
            const jogadores = gameServices.obterTodosOsJogadores();
            res.json(jogadores.sort((a, b) => b.score - a.score));
        });

        // --- MANUTENÇÃO / TESTES ---
        app.post('/api/test/status/:fase', (req, res) => {
            res.json(gameData.updateGameState(req.params.fase));
        });

        app.post('/api/test/reset-round', (req, res) => {
            res.json(gameServices.reiniciarRonda());
        });

        app.post('/api/test/join/:name', (req, res) => {
            const fakeId = 'rest_' + Math.random().toString(36).substring(7);
            res.json(gameServices.handlePlayerJoin(fakeId, req.params.name));
        });
    }
}