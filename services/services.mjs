import { erroUser, erroJogo, MSG } from '../commons/errors.mjs';

export default function init(gameData) {
    if (!gameData) throw new Error("gameData is required");

    return {
        handlePlayerJoin,
        handlePlayerLeave,
        startGame,
        escolherTema,
        sugerirTema,
        obterSugestoes,
        adicionarGif,
        alterarGif,
        votar,
        obterGifs,
        obterTodosOsJogadores,
        obterVotosPorGif,
        obterResultadosGlobais,
        reiniciarRonda
    };

    // ======================================================
    // JOGADORES
    // ======================================================
    function handlePlayerJoin(socketId, playerName) {
        const allPlayers = gameData.getAllPlayers();
        const nomeJaExiste = allPlayers.some(p => p.name.toLowerCase() === playerName.toLowerCase());
        
        if (nomeJaExiste) return { error: erroUser(`O nome '${playerName}' já existe!`) };

        const player = gameData.addPlayer(socketId, playerName);
        return { 
            success: true, 
            player, 
            allPlayers: gameData.getAllPlayers(), 
            gameStatus: gameData.getGameState().status 
        };
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

    function obterTodosOsJogadores() {
        return gameData.getAllPlayers();
    }

    // ======================================================
    // SISTEMA DE TEMAS
    // ======================================================
    function sugerirTema(tema) {
        if (!tema || tema.trim().length < 3) {
            return { error: erroUser("O tema sugerido é demasiado curto!") };
        }
        const sugestoes = gameData.addThemeSuggestion(tema.trim());
        return { success: true, sugestoes };
    }

    function obterSugestoes() {
        return gameData.getThemeSuggestions();
    }

    function escolherTema(tema) {
        if (!tema) return { error: erroJogo("Tens de fornecer um tema para a ronda!") };
        
        gameData.setTheme(tema);
        gameData.updateGameState('playing'); // Ao escolher tema, abre a submissão de GIFs
        return { success: true, tema };
    }

    // ======================================================
    // ESTADO E FLUXO DO JOGO
    // ======================================================
    function startGame() {
        if (gameData.getAllPlayers().length < 2) {
            return { error: erroJogo("Precisam de ser pelo menos 2 jogadores para começar!") };
        }
        // O jogo começa na fase de seleção de tema
        return { success: true, gameState: gameData.updateGameState('selecting_theme') };
    }

    function reiniciarRonda() {
        const novoEstado = gameData.resetRound();
        return { success: true, gameState: novoEstado };
    }

    // ======================================================
    // GIFS E VOTOS (COM PONTUAÇÃO)
    // ======================================================
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
        
        const gif = gameData.getAllGifs().find(g => g.id === gifId);
        if (!gif) return { error: erroJogo(MSG.GIF_INEXISTENTE) };
        if (gif.playerId === playerId) return { error: erroUser(MSG.VOTO_PROPRIO) };
        
        // Registar o voto
        gameData.setVote(playerId, gifId);
        
        // SISTEMA DE PONTOS: +10 pontos para quem enviou o GIF votado
        gameData.updatePlayerScore(gif.playerId, 10);
        
        return { success: true };
    }

    function obterGifs() { 
        return gameData.getAllGifs(); 
    }

    function obterVotosPorGif(gifId) {
        const todosOsVotos = gameData.getAllVotes();
        const votosDesteGif = todosOsVotos.filter(([_, emQuem]) => emQuem === gifId);
        return { 
            gifId, 
            totalVotos: votosDesteGif.length, 
            voters: votosDesteGif.map(([idVotante]) => gameData.getPlayer(idVotante)?.name || "Anónimo") 
        };
    }

    // ======================================================
    // RESULTADOS E RANKING
    // ======================================================
    function obterResultadosGlobais() {
        const gifs = gameData.getAllGifs();
        const todosOsVotos = gameData.getAllVotes();
        
        return gifs.map(gif => {
            const votosNesteGif = todosOsVotos.filter(([_, gifIdVotado]) => gifIdVotado === gif.id);
            const dono = gameData.getPlayer(gif.playerId);

            return {
                gifId: gif.id,
                url: gif.url,
                dono: dono ? dono.name : "Anónimo",
                totalVotos: votosNesteGif.length,
                quemVotou: votosNesteGif.map(([idVotante]) => {
                    const player = gameData.getPlayer(idVotante);
                    return player ? player.name : "Anónimo";
                })
            };
        }).sort((a, b) => b.totalVotos - a.totalVotos);
    }
}