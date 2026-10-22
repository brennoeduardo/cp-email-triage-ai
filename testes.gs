/**
 * =========================================================
 * TESTES MANUAIS
 * =========================================================
 * Rode pelo editor do Apps Script. Nenhum altera e-mails.
 */

/**
 * Classifica um e-mail fictício e mostra o resultado no Log.
 */
function testarClassificacaoIA() {
  const email = {
    assunto: "2ª via - boleto vencido NF 1234",
    remetente: "financeiro@fornecedor.com.br",
    destinatario: "contaspagar@funpar.br",
    copia: "",
    setorApenasEmCopia: false,
    data: new Date(),
    corpo: "Prezados, o boleto da NF 1234 venceu ontem. Favor regularizar para evitar protesto.",
    anexos: [{ nome: "boleto_nf1234.pdf", tipo: "application/pdf", tamanhoBytes: 85000 }],
    totalMensagensConversa: 1,
    historico: []
  };

  Logger.log(JSON.stringify(classificarComChat(email), null, 2));
}

/**
 * Envia um aviso de exemplo para o espaço do Google Chat.
 * Use para validar o webhook (CHAT_WEBHOOK_URL).
 */
function testarNotificacao() {
  notificarEquipe([
    {
      responsavel: RESPONSAVEIS[0],
      assunto: "TESTE - boleto vencido NF 1234",
      remetente: "financeiro@fornecedor.com.br",
      tipo: "COBRANCA",
      urgente: true,
      motivoUrgencia: "Boleto vencido com risco de protesto.",
      resumo: "Regularizar boleto da NF 1234 vencido ontem.",
      link: "https://mail.google.com/"
    },
    {
      responsavel: RESPONSAVEIS[1],
      assunto: "TESTE - envio de NF 889",
      remetente: "notas@fornecedor.com.br",
      tipo: "NOTA_FISCAL",
      urgente: false,
      motivoUrgencia: "",
      resumo: "Lançar NF 889, vencimento 30/11.",
      link: "https://mail.google.com/"
    }
  ]);
}

/**
 * Diagnóstico: mostra quais e-mails da caixa de entrada a automação vê,
 * quais etiquetas cada um tem e por que foi (ou não) considerado pendente.
 */
function diagnosticarBusca() {
  Logger.log("Conta que roda o script: " + Session.getEffectiveUser().getEmail());
  Logger.log("Query usada: " + construirQuery());

  const inbox = GmailApp.search("in:inbox", 0, 20);
  Logger.log(`E-mails na caixa de entrada (até 20): ${inbox.length}`);

  const exclusoes = [LABELS.PROCESSADO_IA, LABELS.ARQUIVADO_IA, LABELS.ERRO_IA];
  inbox.forEach(t => {
    const labels = t.getLabels().map(l => l.getName());
    const bloqueio = labels.filter(l => exclusoes.includes(l));
    Logger.log(`- ${t.getFirstMessageSubject()}\n` +
               `    etiquetas: ${labels.join(", ") || "(nenhuma)"}\n` +
               `    ${bloqueio.length ? "IGNORADO por: " + bloqueio.join(", ") : "PENDENTE"}`);
  });

  Logger.log(`Pendentes pela query: ${buscarEmailsPendentes(CONFIG.MAX_THREADS).length}`);
}

/**
 * Mostra o ID do Chat encontrado para cada responsável.
 * Rode depois de criar as Propriedades do Script EMAIL_<NOME>.
 */
function testarMencoes() {
  RESPONSAVEIS.forEach(nome => {
    const email = obterEmailResponsavel(nome);
    Logger.log(`${nome}: ${email || "(sem e-mail)"} → ${email ? obterIdChat(email) || "NÃO ENCONTRADO" : "-"}`);
  });
}
