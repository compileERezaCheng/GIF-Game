import * as gameServices from '../../services/services.mjs';
import * as db from '../../data/data.mjs'; // Adiciona isto lá no topo!

export function setupSockets(io) {
    // ... (o código dos sockets que já tens fica igualzinho) ...
}

// NOVA FUNÇÃO: Rotas REST para testares no teu Client!
export function setupRestRoutes(app) {
    
    // Rota para ver o estado geral do jogo
    app.get('/api/game', (req, res) => {
        const estado = db.getGameState();
        res.json(estado);
    });

    // Rota para ver todos os jogadores na sala
    app.get('/api/players', (req, res) => {
        const jogadores = db.getAllPlayers();
        res.json({ total: jogadores.length, jogadores: jogadores });
    });

    // Rota "aldrabada" para adicionar um jogador via REST (só para testes)
    app.post('/api/test/join/:name', (req, res) => {
        // Inventamos um ID de socket falso só para testar a lógica
        const fakeSocketId = 'rest_client_' + Math.random().toString(36).substring(7);
        const result = gameServices.handlePlayerJoin(fakeSocketId, req.params.name);
        res.json(result);
    });
}