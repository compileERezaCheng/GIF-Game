export function erroUser(mensagem) {
    return "Erro de Segurança/Utilizador: " + mensagem;
}

export function erroJogo(mensagem) {
    return "Erro de Regra de Negócio: " + mensagem;
}

export const MSG = {
    FASE_ERRADA_GIF: "Ação bloqueada: Não estamos na fase de submissão de imagens.",
    JA_ENVIOU: "Tentativa de duplicado: Já enviaste um GIF para esta ronda.",
    NAO_ENVIOU: "Ação inválida: Não podes alterar o que ainda não enviaste.",
    FASE_ERRADA_VOTO: "Ação bloqueada: Ainda não estamos na fase de votação de GIFs.",
    FASE_ERRADA_VOTO_TEMA: "Ação bloqueada: Ainda não estamos na fase de escolha de tema.",
    GIF_INEXISTENTE: "Erro de integridade: Esse GIF não existe no sistema.",
    VOTO_PROPRIO: "Violação de segurança: Não podes votar no teu próprio GIF!",
    TEMA_CURTO: "Validação falhou: O tema sugerido é demasiado curto.",
    MISSING_ID: "Erro de autenticação: Player ID em falta.",
    JA_VOTOU_TEMA: "Segurança: Já votaste num tema para esta ronda.",
    TEMA_NAO_DISPONIVEL: "Erro: Esse tema não faz parte da votação atual.",
    POUCOS_TEMAS: "Erro: São necessários pelo menos 2 temas sugeridos para iniciar o sorteio."
};