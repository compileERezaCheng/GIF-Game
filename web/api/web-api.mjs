export default function init(gameServices, gameData) {
    return { setupSockets, setupRestRoutes };

    function setupSockets(io) {
        io.on('connection', (socket) => {
            socket.on('join_game', (name) => {
                const res = gameServices.handlePlayerJoin(socket.id, name);
                if (res.error) socket.emit('game_error', res.error);
                else io.emit('update_players', res.allPlayers);
            });
            // Adicionar aqui restantes eventos submit_gif, etc conforme necessário
        });
    }

    function setupRestRoutes(app) {
        app.get('/api/game', (req, res) => res.json(gameData.getGameState()));
        app.get('/api/players', (req, res) => res.json(gameServices.obterTodosOsJogadores()));
        app.get('/api/gifs', (req, res) => res.json(gameServices.obterGifs()));
        app.get('/api/results', (req, res) => res.json(gameServices.obterResultadosGlobais()));
        
        app.post('/api/test/status/:fase', (req, res) => res.json(gameData.updateGameState(req.params.fase)));
        app.post('/api/test/reset-round', (req, res) => res.json(gameServices.reiniciarRonda()));
        
        app.post('/api/gifs', (req, res) => {
            const { playerId, url } = req.body;
            res.json(gameServices.adicionarGif(playerId, url));
        });

        app.post('/api/votes', (req, res) => {
            const { playerId, gifId } = req.body;
            res.json(gameServices.votar(playerId, gifId));
        });

        app.post('/api/test/join/:name', (req, res) => {
            const fakeId = 'rest_' + Math.random().toString(36).substring(7);
            res.json(gameServices.handlePlayerJoin(fakeId, req.params.name));
        });
    }
}