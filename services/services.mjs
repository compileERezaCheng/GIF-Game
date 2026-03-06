import { erroUser, erroJogo, MSG } from '../commons/errors.mjs';

export default function init(gameData) {
    if (!gameData) throw new Error("gameData is required.");

    return {
        handlePlayerJoin, handlePlayerLeave, startGame,
        votarNoTema, finalizarVotacaoTema,
        sugerirTema, adicionarGif, votar, 
        obterResultadosGlobais, reiniciarRonda, reiniciarJogoCompleto,
        obterTodosOsJogadores, obterSugestoes, obterGifs
    };

    function handlePlayerJoin(socketId, playerName) {
        if (!playerName || playerName.trim().length < 2) return { error: erroUser("Nome inválido.") };
        const all = gameData.getAllPlayers();
        if (all.some(p => p.name.toLowerCase() === playerName.toLowerCase()))
            return { error: erroUser(`O nome '${playerName}' já existe.`) };

        const player = gameData.addPlayer(socketId, playerName.trim());
        return { success: true, player, allPlayers: gameData.getAllPlayers() };
    }

    function handlePlayerLeave(socketId) {
        const removed = gameData.removePlayer(socketId);
        if (gameData.getAllPlayers().length === 0) gameData.resetRound();
        return { removed, allPlayers: gameData.getAllPlayers() };
    }

    function startGame() {
        const pool = gameData.getThemeSuggestions();
        if (gameData.getAllPlayers().length < 2) return { error: erroJogo("Mínimo 2 jogadores.") };
        if (pool.length < 2) return { error: erroJogo(MSG.POUCOS_TEMAS) };

        const sorteados = pool.sort(() => 0.5 - Math.random()).slice(0, 2);
        gameData.setThemeBallot(sorteados);
        return { success: true, ballot: sorteados, gameState: gameData.updateGameState('selecting_theme') };
    }

    function votarNoTema(playerId, temaEscolhido) {
        const state = gameData.getGameState();
        if (state.status !== 'selecting_theme') return { error: erroJogo(MSG.FASE_ERRADA_VOTO_TEMA) };
        if (!state.themeBallot.includes(temaEscolhido)) return { error: erroUser(MSG.TEMA_NAO_DISPONIVEL) };

        const votos = gameData.getThemeVotes();
        if (votos.some(([pid]) => pid === playerId)) return { error: erroUser(MSG.JA_VOTOU_TEMA) };

        gameData.castThemeVote(playerId, temaEscolhido);
        return { success: true };
    }

    function finalizarVotacaoTema() {
        const state = gameData.getGameState();
        const votos = gameData.getThemeVotes();
        const contagem = {};
        state.themeBallot.forEach(t => contagem[t] = 0);
        votos.forEach(([_, tema]) => contagem[tema]++);

        const [temaA, temaB] = state.themeBallot;
        const vencedor = contagem[temaA] >= contagem[temaB] ? temaA : temaB;

        gameData.setTheme(vencedor);
        return { success: true, temaVencedor: vencedor, contagem, gameState: gameData.updateGameState('playing') };
    }

    function adicionarGif(playerId, url) {
        const state = gameData.getGameState();
        if (state.status !== 'playing') return { error: erroJogo(MSG.FASE_ERRADA_GIF) };
        if (gameData.getGifByPlayer(playerId)) return { error: erroUser(MSG.JA_ENVIOU) };
        return { success: true, gif: gameData.addGif(playerId, url) };
    }

    function votar(playerId, gifId) {
        const state = gameData.getGameState();
        if (state.status !== 'voting') return { error: erroJogo(MSG.FASE_ERRADA_VOTO) };
        const gif = gameData.getAllGifs().find(g => g.id === gifId);
        if (!gif || gif.playerId === playerId) return { error: erroUser(MSG.VOTO_PROPRIO) };
        
        gameData.setVote(playerId, gifId);
        gameData.updatePlayerScore(gif.playerId, 10);
        return { success: true };
    }

    function sugerirTema(tema) {
        if (!tema || tema.trim().length < 3) return { error: erroUser(MSG.TEMA_CURTO) };
        gameData.addThemeSuggestion(tema.trim());
        return { success: true };
    }

    function obterResultadosGlobais() {
        const state = gameData.getGameState();
        const gifs = gameData.getAllGifs();
        const votes = gameData.getAllVotes();
        return {
            tema: state.currentTheme,
            resultados: gifs.map(g => ({
                dono: gameData.getPlayer(g.playerId)?.name || "Anónimo",
                url: g.url,
                totalVotos: votes.filter(([_, t]) => t === g.id).length,
                quemVotou: votes.filter(([_, t]) => t === g.id).map(([vid]) => gameData.getPlayer(vid)?.name || "Anónimo")
            })).sort((a,b) => b.totalVotos - a.totalVotos)
        };
    }

    function reiniciarRonda() { return gameData.resetRound(); }
    function reiniciarJogoCompleto() { return { success: true, gameState: gameData.fullReset() }; }
    function obterTodosOsJogadores() { return gameData.getAllPlayers(); }
    function obterSugestoes() { return gameData.getThemeSuggestions(); }
    function obterGifs() { return gameData.getAllGifs(); }
}