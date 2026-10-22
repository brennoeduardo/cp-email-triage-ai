/**
 * =========================================================
 * E-MAILS DE TESTE
 * =========================================================
 * criarEmailsTeste() coloca e-mails fictícios direto na caixa de entrada
 * desta conta (Gmail API, messages.insert). Nada é enviado para ninguém.
 * Todos têm "[TESTE]" no assunto: para limpar, busque por
 * subject:"[TESTE]" no Gmail e exclua.
 *
 * Requer o serviço avançado "Gmail API" (já declarado no appsscript.json).
 */

function criarEmailsTeste() {
  const cp = Session.getEffectiveUser().getEmail();
  const hoje = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy");
  const ontem = Utilities.formatDate(new Date(Date.now() - 864e5), "America/Sao_Paulo", "dd/MM/yyyy");
  const daqui20 = Utilities.formatDate(new Date(Date.now() + 20 * 864e5), "America/Sao_Paulo", "dd/MM/yyyy");

  const emails = [
    {
      // Esperado: distribuir, COBRANCA, URGENTE (vencido + protesto)
      de: "Financeiro Copel Telecom <financeiro@copeltelecom-teste.com.br>",
      para: cp,
      assunto: "[TESTE] 2ª via - Fatura vencida - risco de protesto",
      corpo: `Prezados,\n\nA fatura 88231 no valor de R$ 3.480,00, com vencimento em ${ontem}, ` +
             `consta em aberto. Caso o pagamento não seja identificado até amanhã, o título ` +
             `será encaminhado a protesto e o serviço de internet poderá ser suspenso.\n\n` +
             `Segue 2ª via do boleto em anexo.\n\nAtt,\nCobrança Copel Telecom`
    },
    {
      // Esperado: distribuir, NOTA_FISCAL, não urgente
      de: "Notas Fiscais - Papelaria Central <nfe@papelariacentral-teste.com.br>",
      para: cp,
      assunto: "[TESTE] Envio de NF 4512 - material de escritório",
      corpo: `Boa tarde,\n\nSegue NF 4512 referente ao pedido de material de escritório ` +
             `(OF 9921), valor R$ 812,40, vencimento ${daqui20}.\n\nQualquer dúvida estou à disposição.\n\nMarcos`
    },
    {
      // Esperado: arquivar, MARKETING ("urgente" sem prazo real)
      de: "Ofertas Office <promo@ofertasoffice-teste.com>",
      para: cp,
      assunto: "[TESTE] URGENTE!!! Últimas horas com 60% OFF em cadeiras",
      corpo: "Não perca! Cadeiras ergonômicas com 60% de desconto. Clique e aproveite agora. " +
             "Para não receber mais, clique aqui."
    },
    {
      // Esperado: distribuir, ALTERACAO_BANCARIA, URGENTE (suspeita + pagamento hoje)
      de: "Financeiro Papelaria Central <papelariacentral.financeiro@gmail.com>",
      para: cp,
      assunto: "[TESTE] Atualização de dados bancários",
      corpo: `Prezados,\n\nInformamos que nossa conta bancária foi alterada. O pagamento ` +
             `previsto para hoje (${hoje}) deve ser feito na nova conta:\n` +
             `Banco 341 - Ag 0001 - CC 99887-1\n\nPedimos urgência.\n\nFinanceiro`
    },
    {
      // Esperado: arquivar (CP só em cópia, assunto do comprador)
      de: "Compras FUNPAR <compras@funpar-teste.ufpr.br>",
      para: "vendas@moveisbrasil-teste.com.br",
      cc: cp,
      assunto: "[TESTE] RE: OF 9930 - previsão de entrega",
      corpo: "Olá,\n\nObrigado pela confirmação. Aguardamos a entrega na próxima semana " +
             "conforme combinado.\n\nAtt,\nSetor de Compras"
    },
    {
      // Esperado: distribuir, SOLICITACAO_PAGAMENTO, URGENTE (prazo hoje + coordenação)
      de: "Coordenação Projeto Saúde <coord.saude@funpar-teste.ufpr.br>",
      para: cp,
      assunto: "[TESTE] Pagamento de bolsistas - prazo hoje",
      corpo: `Prezados do Contas a Pagar,\n\nSolicito o pagamento da folha de bolsistas do ` +
             `projeto 1234, total R$ 18.600,00. A diretoria pediu prioridade, o prazo é hoje ` +
             `(${hoje}) até as 16h.\n\nPlanilha em anexo.\n\nObrigada,\nCoordenação`
    },
    {
      // Esperado: arquivar, NEWSLETTER
      de: "Portal Contábil <news@portalcontabil-teste.com.br>",
      para: cp,
      assunto: "[TESTE] Newsletter semanal: novidades da Reforma Tributária",
      corpo: "Confira as principais notícias da semana sobre a Reforma Tributária, " +
             "agenda de webinars e artigos selecionados."
    },
    {
      // Esperado: distribuir, COMPROVANTE, não urgente
      de: "Ana - Laboratório Bio <ana@labbio-teste.com.br>",
      para: cp,
      assunto: "[TESTE] Solicitação de comprovante - NF 7781",
      corpo: "Bom dia,\n\nPoderiam nos enviar o comprovante de pagamento da NF 7781? " +
             "Não localizamos o crédito na nossa conta.\n\nObrigada,\nAna"
    }
  ];

  emails.forEach(e => {
    Gmail.Users.Messages.insert(
      { raw: montarMime(e), labelIds: ["INBOX", "UNREAD"] },
      "me"
    );
    Logger.log("Criado: " + e.assunto);
  });

  Logger.log(`${emails.length} e-mails de teste criados na caixa de entrada.`);
}

/**
 * Monta a mensagem no formato RFC 822, codificada em base64 web-safe.
 */
function montarMime(e) {
  const linhas = [
    "From: " + cabecalhoEndereco(e.de),
    "To: " + e.para,
    e.cc ? "Cc: " + e.cc : null,
    "Subject: " + codificarCabecalho(e.assunto),
    "Date: " + new Date().toUTCString(),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Utilities.base64Encode(e.corpo, Utilities.Charset.UTF_8)
  ].filter(l => l !== null);

  return Utilities.base64EncodeWebSafe(linhas.join("\r\n"), Utilities.Charset.UTF_8);
}

/**
 * "Nome <email>" com o nome codificado (acentos).
 */
function cabecalhoEndereco(endereco) {
  const m = endereco.match(/^(.*)<(.+)>$/);
  return m ? `${codificarCabecalho(m[1].trim())} <${m[2]}>` : endereco;
}

function codificarCabecalho(texto) {
  return "=?UTF-8?B?" + Utilities.base64Encode(texto, Utilities.Charset.UTF_8) + "?=";
}
