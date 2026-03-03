export function erroUser(mensagem) {
    return "Erro no user: " + mensagem;
}

export function erroJogo(mensagem) {
    return "Erro no jogo: " + mensagem;
}

export const MSG = {
    FASE_ERRADA_GIF: "Não estamos na fase de submissão de imagens.",
    JA_ENVIOU: "Já enviaste um GIF! Usa a função de alterar.",
    NAO_ENVIOU: "Ainda não enviaste nenhum GIF para poder alterar!",
    FASE_ERRADA_VOTO: "Ainda não estamos na fase de votação.",
    GIF_INEXISTENTE: "Esse GIF não existe!",
    VOTO_PROPRIO: "Não podes votar no teu próprio GIF, batoteiro!"
};