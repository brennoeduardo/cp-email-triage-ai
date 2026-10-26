/**
 * =========================================================
 * PERFIL DA UNIDADE: CONTAS A PAGAR
 * =========================================================
 * TUDO o que muda de uma unidade (setor) para outra fica neste arquivo:
 * nome do setor, equipe do rodízio, tipos de e-mail e as regras de negócio
 * que a IA segue. Os demais arquivos são genéricos e não precisam mudar.
 *
 * Para usar em outra unidade (ex.: Contas a Receber), troque este arquivo
 * pelo modelo em modelos/unidade-modelo.gs e preencha. O passo a passo
 * está no README, em "Usar em outra unidade".
 */

const UNIDADE = {

  // Como a IA e os avisos se referem ao setor.
  ORGANIZACAO: "FUNPAR",
  NOME: "Contas a Pagar",

  // Endereços do setor (caixa principal e aliases). Usados para a IA saber
  // se o setor está em PARA ou só em CÓPIA. Se vazio, usa a conta que roda o script.
  EMAILS_SETOR: [],

  /**
   * Tipos de e-mail que ESTE setor atende. O código vai na resposta da IA,
   * o nome aparece no aviso do Google Chat e a descrição orienta a IA.
   * Os tipos gerais (INFORMACAO, NEWSLETTER, MARKETING, EVENTO, SPAM, OUTROS)
   * já são incluídos automaticamente; não repita aqui.
   */
  TIPOS: [
    { codigo: "SOLICITACAO_PAGAMENTO", nome: "Solicitação de pagamento", descricao: "pedido de pagamento feito por setor/projeto interno" },
    { codigo: "NOTA_FISCAL",           nome: "Nota fiscal",              descricao: "envio ou questão sobre NF / NFS-e / fatura" },
    { codigo: "BOLETO",                nome: "Boleto",                   descricao: "envio de boleto para pagamento" },
    { codigo: "COBRANCA",              nome: "Cobrança",                 descricao: "cobrança de valor em aberto ou atrasado" },
    { codigo: "FORNECEDOR",            nome: "Fornecedor",               descricao: "dúvida, retorno ou posição solicitada por fornecedor" },
    { codigo: "ALTERACAO_BANCARIA",    nome: "Alteração bancária",       descricao: "alteração de dados bancários / PIX" },
    { codigo: "COMPROVANTE",           nome: "Comprovante",              descricao: "pedido ou envio de comprovante de pagamento" },
    { codigo: "CANCELAMENTO",          nome: "Cancelamento",             descricao: "cancelamento ou substituição de NF, boleto ou pagamento" },
    { codigo: "CONTRATO",              nome: "Contrato",                 descricao: "contrato, aditivo, medição" },
    { codigo: "ORDEM_FORNECIMENTO",    nome: "Ordem de fornecimento",    descricao: "assuntos de OF" },
    { codigo: "PRESTACAO_CONTAS",      nome: "Prestação de contas",      descricao: "prestação de contas" },
    { codigo: "REEMBOLSO",             nome: "Reembolso",                descricao: "reembolso / ressarcimento" },
    { codigo: "CADASTRO_FORNECEDOR",   nome: "Cadastro de fornecedor",   descricao: "cadastro ou atualização cadastral de fornecedor" }
  ],

  /**
   * Trechos do prompt específicos do setor. Escreva em português simples,
   * em tópicos. O restante do prompt (formato da resposta, prioridade,
   * confiança, regras gerais) é comum a todas as unidades.
   */
  PROMPT: {

    // O que exige ação da equipe. A lista do que NÃO exige (newsletter,
    // marketing, avisos automáticos...) já é comum a todas as unidades.
    PRECISA_ATENDIMENTO: `
- Solicitação de pagamento
- Envio de Nota Fiscal, fatura ou boleto para pagamento
- Cobrança ou aviso de débito em aberto
- Solicitação de comprovante de pagamento
- Fornecedor pedindo retorno, posição de pagamento ou tirando dúvida
- Divergência de valor, pagamento em duplicidade ou pagamento não recebido
- Alteração de dados bancários
- Cancelamento ou substituição de NF / boleto
- Pendências ou regularização financeira
- Solicitação enviada por outro setor da FUNPAR para Contas a Pagar
- Documentação necessária para pagamento
- Prestação de contas, reembolso ou cadastro de fornecedor
- Resposta a uma pergunta feita anteriormente pelo setor (o setor precisa ler e dar seguimento)`,

    // Regras da casa: exceções, casos que confundem, golpes conhecidos.
    REGRAS_ESPECIFICAS: `
Considere como NÃO necessitando atendimento:

- Envio de Ordem de Fornecimento (OF) para fornecedores.
- Confirmação de recebimento de OF ou de e-mails.
- Agradecimentos e respostas de cortesia ("ok", "obrigado", "recebido") sem novo pedido.
- Previsão de entrega.
- Assuntos destinados ao comprador ou a outro setor.
- Mensagens em que Contas a Pagar está apenas em cópia e nada é pedido ao setor.

Mesmo que exista uma OF ou Nota Fiscal mencionada, só marque
precisaAtendimento = true quando houver uma solicitação direcionada ao
setor de Contas a Pagar (ou documento enviado PARA pagamento).

Quando setorApenasEmCopia = true, a regra padrão é false. Só marque true se o
corpo pedir algo explicitamente ao financeiro / Contas a Pagar.

Atenção a golpes: pedido de alteração bancária vindo de domínio estranho,
remetente diferente do fornecedor habitual ou com tom de pressão deve ser
ATENDIDO (true, tipo ALTERACAO_BANCARIA) para que a equipe confira. Nunca
arquive alteração bancária.`,

    // Situações que tornam um e-mail URGENTE (prejuízo nas próximas 48 h).
    URGENTE: `
- Vencimento hoje, amanhã, ou já vencido (compare com dataHoje).
- Fornecedor ameaçando protesto, negativação, juros, multa ou suspensão de serviço.
- Corte ou bloqueio iminente (energia, internet, telefonia, sistemas, fornecimento).
- Prazo explícito curto para resposta ou envio de documento ("até hoje", "até amanhã às 12h").
- Cobrança reiterada (segunda ou terceira cobrança, "reitero", "conforme e-mails anteriores").
- Pagamento não recebido que o fornecedor já esperava.
- Suspeita de fraude em dados bancários com pagamento próximo.
- Solicitação da diretoria / coordenação pedindo prioridade.`,

    // Situações que parecem urgentes mas NÃO são.
    NAO_URGENTE: `
- Vencimento a mais de 3 dias.
- Envio rotineiro de NF / boleto sem prazo próximo.`,

    // Exemplos curtos que aparecem no meio das instruções (opcionais).
    EXEMPLO_URGENCIA: "Boleto vence hoje.",
    EXEMPLO_TIPO: "fornecedor cobrando boleto vencido → COBRANCA",
    EXEMPLOS_MOTIVO: "Fornecedor enviou nota fiscal. / Email promocional. / Confirmação de recebimento da OF.",

    // O que o resumo deve destacar (aparece no aviso do Google Chat).
    DICAS_RESUMO: `Cite número de NF/boleto, valor e vencimento quando existirem.
Ex.: Pagar boleto da Copel, R$ 1.250,00, vencimento 15/01.`,

    // Exemplos de e-mails e da decisão esperada. Use apenas códigos de TIPOS
    // ou dos tipos gerais.
    EXEMPLOS: `
Assunto: RE: OF 4587 - confirmação | Corpo: Recebido, obrigado. Entrega prevista para sexta.
→ precisaAtendimento false, tipo ORDEM_FORNECIMENTO, prioridade BAIXA, urgente false

Assunto: 2ª via boleto vencido | Corpo: Prezados, o boleto da NF 1234 venceu ontem, favor regularizar para evitar protesto.
→ precisaAtendimento true, tipo COBRANCA, prioridade ALTA, urgente true, motivoUrgencia Boleto vencido com risco de protesto.

Assunto: Envio de NF 889 | Anexo nf889.pdf | Corpo: Segue nota fiscal referente ao serviço de outubro, vencimento 30/11.
(dataHoje em outubro) → precisaAtendimento true, tipo NOTA_FISCAL, prioridade NORMAL, urgente false

Assunto: URGENTE!!! Últimas vagas com 50% de desconto
→ precisaAtendimento false, tipo MARKETING, prioridade BAIXA, urgente false

Assunto: Novos dados bancários | Remetente: financeiro.fornecedor@gmail.com | Corpo: Favor efetuar o pagamento de hoje na nova conta abaixo.
→ precisaAtendimento true, tipo ALTERACAO_BANCARIA, prioridade ALTA, urgente true, motivoUrgencia Alteração bancária suspeita com pagamento hoje.`
  }
};

/**
 * Responsáveis pela triagem. A ORDEM define o rodízio (round-robin).
 * O nome também é o nome da etiqueta aplicada na distribuição e o sufixo
 * da Propriedade do Script EMAIL_<NOME> usada para @mencionar no Chat.
 */
const RESPONSAVEIS = [
  "EDUARDO",
  "IAN",
  "NATALIA",
  "ANDRESSA",
  "BRENNO"
];
