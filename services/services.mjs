// Importamos tudo o que fizemos no ficheiro de dados
import * as db from '../data/data.mjs';

// --- LÓGICA DE JOGADORES ---

export function handlePlayerJoin(socketId, playerName) {
    const gameState = db.getGameState();
    
    // Regra: Se o jogo já estiver na fase de votação, talvez não devesse entrar?
    // Por agora deixamos entrar, mas já vês como é fácil adicionar regras aqui!
    const player = db.addPlayer(socketId, playerName);
    const allPlayers = db.getAllPlayers();

    // Devolvemos um "pacote" com tudo o que a interface vai precisar saber
    return {
        success: true,
        player: player,
        allPlayers: allPlayers,
        gameStatus: gameState.status
    };
}

export function handlePlayerLeave(socketId) {
    const removedPlayer = db.removePlayer(socketId);
    const allPlayers = db.getAllPlayers();

    // Regra de Ouro: Se não sobrar ninguém no jogo, fazemos reset para 'waiting'
    if (allPlayers.length === 0) {
        db.updateGameState('waiting');
        db.getGameState().gifsSubmitted = []; // Limpa os GIFs
    }

    return {
        removedPlayer: removedPlayer,
        allPlayers: allPlayers
    };
}

// --- LÓGICA DO JOGO ---

export function startGame() {
    const players = db.getAllPlayers();
    
    // Regra: Precisamos de pelo menos 2 amigos para ter piada!
    if (players.length < 2) {
        return { error: "Precisam de ser pelo menos 2 jogadores para começar a festa!" };
    }

    const newState = db.updateGameState('playing');
    return { success: true, gameState: newState };
}

export function handleGifSubmission(socketId, gifUrl) {
    const gameState = db.getGameState();
    const player = db.getPlayer(socketId);

    // Regras de segurança básicas
    if (!player) return { error: "Jogador não encontrado!" };
    if (gameState.status !== 'playing') return { error: "Ainda não estamos na fase de caça aos GIFs!" };

    // Verifica se este jogador já enviou um GIF nesta ronda (para não fazer spam)
    const alreadySubmitted = gameState.gifsSubmitted.find(g => g.playerId === socketId);
    if (alreadySubmitted) {
        return { error: "Já enviaste o teu GIF, espertinho! Espera pelos outros." };
    }

    // Guarda o GIF com o dono e prepara os votos para a Ronda 3
    gameState.gifsSubmitted.push({
        playerId: socketId,
        playerName: player.name,
        gifUrl: gifUrl,
        votes: 0
    });

    return { success: true, totalSubmitted: gameState.gifsSubmitted.length };
}