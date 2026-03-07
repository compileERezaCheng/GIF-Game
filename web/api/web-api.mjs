/**
 * Módulo de API (REST) - APENAS PARA TESTES HTTP
 * Este ficheiro não é usado pelo site, serve para testares via ficheiro .http
 */
export default function init(gameServices, gameData) {
    return { setupSockets, setupRestRoutes };

    function setupSockets(io) {
        // Para os testes REST, o socket.io pode ficar vazio ou apenas com logs
        io.on('connection', (socket) => {
            console.log('🧪 Teste: Socket ligado para debug:', socket.id);
        });
    }

    function setupRestRoutes(app) {
        // --- CONSULTAS ---
        
        // Ver estado de uma sala específica
        app.get('/api/test/room/:code', (req, res) => {
            const room = gameData.getRoom(req.params.code.toUpperCase());
            res.json(room || { error: "Sala não encontrada" });
        });

        // Ver todos os jogadores de uma sala
        app.get('/api/test/room/:code/players', (req, res) => {
            res.json(gameData.getAllPlayersInRoom(req.params.code.toUpperCase()));
        });

        // --- AÇÕES DE TESTE (Simular passos do jogo) ---

        // Criar um jogador "fake" numa sala
        app.post('/api/test/join/:code/:name', async (req, res) => {
            const fakeUserId = 'test_user_' + Math.random().toString(36).substring(7);
            const player = await gameServices.login(fakeUserId, req.params.name);
            const room = gameData.joinRoom(fakeUserId, req.params.code.toUpperCase());
            res.json({ player, room });
        });

        // Forçar início de jogo numa sala
        app.post('/api/test/room/:code/start', async (req, res) => {
            const room = gameData.getRoom(req.params.code.toUpperCase());
            if (!room) return res.json({ error: "Sala não existe" });
            
            await gameServices.startGame(room.hostId, 3); // Inicia com 3 rondas por defeito
            res.json({ success: true, status: "THEME_SUBMISSION" });
        });

        // Ver sugestões de temas
        app.get('/api/test/room/:code/themes', (req, res) => {
            res.json(gameData.getThemeSuggestions(req.params.code.toUpperCase()));
        });

        // Forçar reset de uma sala
        app.post('/api/test/room/:code/reset', (req, res) => {
            const code = req.params.code.toUpperCase();
            gameData.resetRoomRound(code);
            res.json({ success: true, message: "Ronda da sala " + code + " limpa." });
        });

        // Full Reset (Limpa tudo no servidor)
        app.post('/api/test/full-reset', (req, res) => {
            res.json(gameData.fullReset ? gameData.fullReset() : { message: "Função não implementada" });
        });
    }
}