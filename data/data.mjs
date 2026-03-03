// A nossa "Base de Dados" em memória
const players = new Map(); // Usamos Map porque é mais rápido a procurar por ID do socket
const game = {
    status: 'waiting', // pode ser: 'waiting', 'playing', 'voting', 'finished'
    round: 1,
    gifsSubmitted: []
};

// --- FUNÇÕES DE JOGADORES ---

export function addPlayer(socketId, name = "Anónimo") {
    const newPlayer = {
        id: socketId,
        name: name,
        score: 0
    };
    players.set(socketId, newPlayer);
    return newPlayer;
}

export function removePlayer(socketId) {
    const player = players.get(socketId);
    if (player) {
        players.delete(socketId);
    }
    return player; // Devolvemos o jogador removido caso seja preciso avisar os outros
}

export function getPlayer(socketId) {
    return players.get(socketId);
}

export function getAllPlayers() {
    // Transforma o Map num Array normal para ser mais fácil de enviar para o Frontend
    return Array.from(players.values());
}

// --- FUNÇÕES DO JOGO (Para usar mais tarde) ---

export function updateGameState(newStatus) {
    game.status = newStatus;
    return game;
}

export function getGameState() {
    return game;
}