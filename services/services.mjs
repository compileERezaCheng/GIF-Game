import { erroUser, erroJogo, MSG } from '../commons/errors.mjs';

export default function init(gameData) {
    if (!gameData) throw new Error("gameData is required");

    return {
        handlePlayerJoin, handlePlayerLeave, startGame,
        adicionarGif, alterarGif, votar, obterGifs, 
        obterVotosPorGif, obterResultadosGlobais, 
        reiniciarRonda, obterTodosOsJogadores
    };

    function handlePlayerJoin(socketId, playerName) {
        const allPlayers = gameData.getAllPlayers();
        const nomeJaExiste = allPlayers.some(p => p.name.toLowerCase() === playerName.toLowerCase());
        if (nomeJaExiste) return { error: erroUser(`O nome '${playerName}' já existe!`) };

        const player = gameData.addPlayer(socketId, playerName);
        return { success: true, player, allPlayers: gameData.getAllPlayers(), gameStatus: gameData.getGameState().status };
    }

    function handlePlayerLeave(socketId) {
        const removedPlayer = gameData.removePlayer(socketId);
        const allPlayers = gameData.getAllPlayers();
        if (allPlayers.length === 0) {
            gameData.updateGameState('waiting');
            gameData.getGameState().gifs.clear(); 
            gameData.getGameState().votes.clear(); 
        }
        return { removedPlayer, allPlayers };
    }

    function obterTodosOsJogadores() { return gameData.getAllPlayers(); }

    function startGame() {
        if (gameData.getAllPlayers().length < 2) return { error: erroJogo("Mínimo 2 jogadores!") };
        return { success: true, gameState: gameData.updateGameState('playing') };
    }

    function adicionarGif(playerId, gifUrl) {
        if (gameData.getGameState().status !== 'playing') return { error: erroJogo(MSG.FASE_ERRADA_GIF) };
        if (gameData.getGifByPlayer(playerId)) return { error: erroUser(MSG.JA_ENVIOU) };
        return { success: true, gif: gameData.addGif(playerId, gifUrl) };
    }

    function alterarGif(playerId, newGifUrl) {
        if (gameData.getGameState().status !== 'playing') return { error: erroJogo(MSG.FASE_ERRADA_GIF) };
        const gifExistente = gameData.getGifByPlayer(playerId);
        if (!gifExistente) return { error: erroUser(MSG.NAO_ENVIOU) };
        return { success: true, gif: gameData.updateGif(gifExistente.id, newGifUrl) };
    }

    function votar(playerId, gifId) {
        if (gameData.getGameState().status !== 'voting') return { error: erroJogo(MSG.FASE_ERRADA_VOTO) };
        const gifEscolhido = gameData.getAllGifs().find(g => g.id === gifId);
        if (!gifEscolhido) return { error: erroJogo(MSG.GIF_INEXISTENTE) };
        if (gifEscolhido.playerId === playerId) return { error: erroUser(MSG.VOTO_PROPRIO) };
        gameData.setVote(playerId, gifId);
        return { success: true };
    }

    function obterGifs() { return gameData.getAllGifs(); }

    function obterVotosPorGif(gifId) {
        const todosOsVotos = gameData.getAllVotes();
        const votosDesteGif = todosOsVotos.filter(([_, emQuem]) => emQuem === gifId);
        return { 
            gifId, 
            totalVotos: votosDesteGif.length, 
            voters: votosDesteGif.map(([idVotante]) => gameData.getPlayer(idVotante)?.name || "Anónimo") 
        };
    }

    function obterResultadosGlobais() {
        const gifs = gameData.getAllGifs();
        const todosOsVotos = gameData.getAllVotes();
        
        return gifs.map(gif => {
            // Filtra quem votou neste GIF específico
            const votosNesteGif = todosOsVotos.filter(([idVotante, gifIdVotado]) => gifIdVotado === gif.id);
            
            return {
                gifId: gif.id,
                url: gif.url,
                dono: gameData.getPlayer(gif.playerId)?.name || "Anónimo",
                totalVotos: votosNesteGif.length,
                quemVotou: votosNesteGif.map(([idVotante]) => {
                    const player = gameData.getPlayer(idVotante);
                    return player ? player.name : "Anónimo";
                })
            };
        }).sort((a, b) => b.totalVotos - a.totalVotos);
    }

    function reiniciarRonda() { return { success: true, gameState: gameData.resetRound() }; }
}