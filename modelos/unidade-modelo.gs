/**
 * =========================================================
 * PERFIL DA UNIDADE: <NOME DO SETOR>
 * =========================================================
 * MODELO para levar a automação a outra unidade (ex.: Contas a Receber).
 *
 * Como usar:
 *   1. No projeto do Apps Script da nova unidade, crie o arquivo unidade.gs
 *      e cole ESTE conteúdo nele (não copie a pasta "modelos" para o projeto).
 *   2. Troque tudo que está entre < > e revise cada lista.
 *   3. Siga o checklist do README, em "Usar em outra unidade".
 *
 * Use o unidade.gs do Contas a Pagar como exemplo de preenchimento.
 */

const UNIDADE = {

  // Como a IA e os avisos se referem ao setor.
  ORGANIZACAO: "FUNPAR",
  NOME: "<Nome do setor, ex.: Contas a Receber>",

  // Endereços do setor (caixa principal e aliases). Usados para a IA saber
  // se o setor está em PARA ou só em CÓPIA. Se vazio, usa a conta que roda o script.
  EMAILS_SETOR: [],

  /**
   * Tipos de e-mail que ESTE setor atende (de 5 a 15 costuma funcionar bem).
   * codigo: MAIÚSCULAS_SEM_ACENTO | nome: aparece no Chat | descricao: orienta a IA.
   * Os tipos gerais (INFORMACAO, NEWSLETTER, MARKETING, EVENTO, SPAM, OUTROS)
   * já são incluídos automaticamente; não repita aqui.
   */
  TIPOS: [
    { codigo: "<TIPO_1>", nome: "<Nome do tipo 1>", descricao: "<quando usar este tipo>" },
    { codigo: "<TIPO_2>", nome: "<Nome do tipo 2>", descricao: "<quando usar este tipo>" }
  ],

  PROMPT: {

    // O que exige ação da equipe. Um tópico por linha, começando com "- ".
    PRECISA_ATENDIMENTO: `
- <Ex.: Cliente enviando comprovante de pagamento para baixa>
- <Ex.: Pedido de emissão ou segunda via de boleto / nota>
- <Ex.: Dúvida sobre valor cobrado ou contestação>
- Resposta a uma pergunta feita anteriormente pelo setor (o setor precisa ler e dar seguimento)`,

    // Regras da casa: o que parece pedido mas não é, assuntos de outros setores,
    // golpes conhecidos, o que nunca pode ser arquivado.
    REGRAS_ESPECIFICAS: `
Considere como NÃO necessitando atendimento:

- Agradecimentos e respostas de cortesia ("ok", "obrigado", "recebido") sem novo pedido.
- Assuntos destinados a outro setor.
- Mensagens em que <Nome do setor> está apenas em cópia e nada é pedido ao setor.
- <Outras regras do setor>

Quando setorApenasEmCopia = true, a regra padrão é false. Só marque true se o
corpo pedir algo explicitamente ao setor.`,

    // Situações que tornam um e-mail URGENTE (prejuízo nas próximas 48 h).
    URGENTE: `
- Prazo explícito curto para resposta ou envio de documento ("até hoje", "até amanhã às 12h").
- Solicitação da diretoria / coordenação pedindo prioridade.
- <Ex.: Vencimento hoje ou amanhã>`,

    // Situações que parecem urgentes mas NÃO são (um tópico por linha).
    NAO_URGENTE: `
- <Ex.: Prazo a mais de 3 dias.>`,

    // Exemplos curtos que aparecem no meio das instruções (opcionais: "" para não usar).
    EXEMPLO_URGENCIA: "<Ex.: Prazo de resposta termina hoje.>",
    EXEMPLO_TIPO: "<Ex.: cliente contestando boleto vencido → TIPO_X>",
    EXEMPLOS_MOTIVO: "<Ex.: Cliente enviou comprovante. / Email promocional.>",

    // O que o resumo deve destacar (aparece no aviso do Google Chat).
    DICAS_RESUMO: `<Ex.: Cite cliente, valor e vencimento quando existirem.>
<Ex.: Emitir segunda via do boleto, R$ 800,00, vencimento 10/11.>`,

    // 3 a 6 e-mails típicos e a decisão esperada. Use os códigos de TIPOS
    // ou dos tipos gerais. Inclua ao menos um que deve ser arquivado.
    EXEMPLOS: `
Assunto: <assunto> | Corpo: <trecho>
→ precisaAtendimento true, tipo <TIPO_1>, prioridade NORMAL, urgente false

Assunto: <assunto> | Corpo: <trecho>
→ precisaAtendimento false, tipo INFORMACAO, prioridade BAIXA, urgente false`
  }
};

/**
 * Responsáveis pela triagem. A ORDEM define o rodízio (round-robin).
 * O nome também é o nome da etiqueta aplicada na distribuição e o sufixo
 * da Propriedade do Script EMAIL_<NOME> usada para @mencionar no Chat.
 * Use MAIÚSCULAS, sem acento e sem espaço.
 */
const RESPONSAVEIS = [
  "<PESSOA1>",
  "<PESSOA2>"
];
