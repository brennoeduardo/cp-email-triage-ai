/**
 * =========================================================
 * INTEGRAÇÃO COM O GMAIL
 * =========================================================
 */

/**
 * Monta a query de busca, excluindo o que a IA já tratou.
 * Isso evita reprocessar e-mails caso o arquivamento falhe em algum momento.
 * @returns {string}
 */
function construirQuery() {
  const exclusoes = [
    `-label:"${LABELS.PROCESSADO_IA}"`,
    `-label:"${LABELS.ARQUIVADO_IA}"`,
    `-label:"${LABELS.ERRO_IA}"`
  ];
  return `in:inbox ${exclusoes.join(" ")}`;
}

/**
 * Retorna os e-mails pendentes da caixa de entrada (ainda não tratados pela IA).
 * @param {number} limite Quantidade máxima de threads.
 * @returns {GmailThread[]}
 */
function buscarEmailsPendentes(limite) {
  const max = limite || CONFIG.MAX_THREADS;
  return GmailApp.search(construirQuery(), 0, max);
}

/**
 * Extrai as informações principais de uma thread, incluindo anexos.
 * @param {GmailThread} thread
 * @returns {Object}
 */
function obterDadosEmail(thread) {
  const mensagens = thread.getMessages();
  const mensagem = mensagens[mensagens.length - 1];

  // Só anexos reais (ignora imagens embutidas em assinatura, por exemplo).
  const anexos = mensagem
    .getAttachments({ includeInlineImages: false, includeAttachments: true })
    .map(a => ({
      nome: a.getName(),
      tipo: a.getContentType(),
      tamanhoBytes: a.getSize()
    }));

  const destinatario = mensagem.getTo() || "";
  const copia = mensagem.getCc() || "";

  return {
    thread: thread,
    mensagem: mensagem,
    id: thread.getId(),
    assunto: mensagem.getSubject(),
    remetente: mensagem.getFrom(),
    destinatario: destinatario,
    copia: copia,
    data: mensagem.getDate(),
    corpo: truncar(mensagem.getPlainBody(), CONFIG.MAX_CHARS_CORPO),
    anexos: anexos,
    setorApenasEmCopia: setorApenasEmCopia(destinatario, copia),
    totalMensagensConversa: mensagens.length,
    historico: obterHistorico(mensagens)
  };
}

/**
 * Resumo das mensagens anteriores da conversa (mais recentes primeiro),
 * para a IA entender o contexto de respostas como "segue em anexo" ou "ok".
 * @param {GmailMessage[]} mensagens
 * @returns {Object[]}
 */
function obterHistorico(mensagens) {
  return mensagens
    .slice(0, -1)
    .slice(-CONFIG.MAX_MENSAGENS_HISTORICO)
    .reverse()
    .map(m => ({
      remetente: m.getFrom(),
      data: m.getDate(),
      corpo: truncar(m.getPlainBody(), CONFIG.MAX_CHARS_HISTORICO)
    }));
}

/**
 * Endereços que representam o setor (minúsculos).
 * @returns {string[]}
 */
function obterEmailsSetor() {
  const lista = CONFIG.EMAILS_SETOR.length
    ? CONFIG.EMAILS_SETOR
    : [Session.getEffectiveUser().getEmail()];
  return lista.filter(Boolean).map(e => e.toLowerCase());
}

/**
 * true quando algum endereço do setor está em CC e nenhum está em PARA.
 * @returns {boolean}
 */
function setorApenasEmCopia(para, cc) {
  const setor = obterEmailsSetor();
  const contem = campo => setor.some(e => campo.toLowerCase().includes(e));
  return contem(cc) && !contem(para);
}

/**
 * Corta o texto no limite informado, sinalizando o corte.
 */
function truncar(texto, limite) {
  const t = texto || "";
  return t.length > limite ? t.slice(0, limite) + "\n[...truncado...]" : t;
}

/**
 * Link para abrir a conversa no Gmail.
 * Usa o e-mail da conta dona da caixa (a que roda o script) no lugar do
 * índice "u/0". Assim o Gmail abre direto na conta do Contas a Pagar,
 * mesmo que a pessoa esteja usando a conta pessoal como principal,
 * desde que ela também esteja logada na conta do setor no navegador.
 */
function linkThread(thread) {
  // Formato "?authuser=" (o formato "/u/<email>/" dá erro 404 no Gmail).
  const conta = Session.getEffectiveUser().getEmail();
  return `https://mail.google.com/mail/?authuser=${conta}#all/${thread.getId()}`;
}

/**
 * Arquiva uma thread (remove da caixa de entrada).
 */
function arquivarThread(thread) {
  thread.moveToArchive();
}

/**
 * Marca uma thread como lida.
 */
function marcarComoLida(thread) {
  thread.markRead();
}

/**
 * Marca uma thread como não lida.
 */
function marcarComoNaoLida(thread) {
  thread.markUnread();
}

/**
 * Obtém uma etiqueta ou cria caso não exista.
 * @param {string} nome
 * @returns {GmailLabel}
 */
function obterOuCriarEtiqueta(nome) {
  let etiqueta = GmailApp.getUserLabelByName(nome);
  if (!etiqueta) {
    etiqueta = GmailApp.createLabel(nome);
  }
  return etiqueta;
}

/**
 * Adiciona uma etiqueta na thread.
 */
function adicionarEtiqueta(thread, nomeEtiqueta) {
  const etiqueta = obterOuCriarEtiqueta(nomeEtiqueta);
  thread.addLabel(etiqueta);
}

/**
 * Verifica se a thread já foi atribuída a algum responsável.
 * @returns {boolean}
 */
function possuiResponsavel(thread) {
  const labels = thread.getLabels().map(label => label.getName());
  return RESPONSAVEIS.some(responsavel => labels.includes(responsavel));
}

/**
 * Retorna o responsável já atribuído à thread, ou null.
 * @returns {string|null}
 */
function obterResponsavel(thread) {
  const labels = thread.getLabels().map(label => label.getName());
  return RESPONSAVEIS.find(r => labels.includes(r)) ?? null;
}