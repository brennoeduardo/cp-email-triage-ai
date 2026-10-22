/**
 * =========================================================
 * EXECUÇÃO DA AÇÃO
 * =========================================================
 * Retorna um objeto com os dados da distribuição (para o aviso à equipe)
 * ou null quando o e-mail foi apenas arquivado.
 */
function executarAcao(thread, email, resultado) {

  // Fail-safe: a IA quer arquivar, mas não tem certeza → manda para alguém.
  const arquivar = !resultado.precisaAtendimento &&
                   resultado.confianca >= CONFIG.CONFIANCA_MINIMA_ARQUIVAR;

  if (!resultado.precisaAtendimento && !arquivar) {
    Logger.log(`⚠️ Confiança baixa (${resultado.confianca}) para arquivar. Distribuindo.`);
  }

  // ===============================
  // MODO SIMULAÇÃO (não altera nada)
  // ===============================
  if (CONFIG.SIMULAR) {
    Logger.log("======== SIMULAÇÃO ========");
    Logger.log(`Tipo: ${resultado.tipo} | Prioridade: ${resultado.prioridade} | ` +
               `Urgente: ${resultado.urgente} ${resultado.motivoUrgencia} | ` +
               `Confiança: ${resultado.confianca} | Motivo: ${resultado.motivo}`);
    Logger.log(`Resumo: ${resultado.resumo}`);

    if (arquivar) {
      Logger.log("Ação: Arquivar (ARQUIVADO POR IA)");
      return null;
    }

    const previsto = visualizarProximoResponsavel();
    Logger.log(`Ação: Distribuir para ${previsto}` +
               (resultado.urgente ? ` + etiqueta ${LABELS.URGENTE}` : ""));
    return montarDistribuicao(thread, email, resultado, previsto);
  }

  // ===============================
  // NÃO PRECISA ATENDIMENTO → arquiva
  // ===============================
  if (arquivar) {
    Logger.log(`📦 [ARQUIVADO POR IA] ${email.assunto} (${resultado.motivo})`);
    adicionarEtiqueta(thread, LABELS.ARQUIVADO_IA);
    arquivarThread(thread);
    return null;
  }

  // ===============================
  // PRECISA ATENDIMENTO → distribui e arquiva
  // ===============================
  const responsavel = distribuirThread(thread);
  adicionarEtiqueta(thread, LABELS.PROCESSADO_IA);
  if (resultado.urgente) {
    adicionarEtiqueta(thread, LABELS.URGENTE);
  }
  arquivarThread(thread);

  Logger.log(`👤 [DISTRIBUÍDO] ${email.assunto} → ${responsavel} ` +
             `(${resultado.tipo}/${resultado.prioridade}` +
             (resultado.urgente ? "/URGENTE" : "") + `) e ARQUIVADO.`);

  return montarDistribuicao(thread, email, resultado, responsavel);
}

/**
 * Dados de uma distribuição usados no aviso à equipe.
 */
function montarDistribuicao(thread, email, resultado, responsavel) {
  return {
    responsavel: responsavel,
    assunto: email.assunto,
    remetente: email.remetente,
    tipo: resultado.tipo,
    urgente: resultado.urgente,
    motivoUrgencia: resultado.motivoUrgencia,
    resumo: resultado.resumo || resultado.motivo,
    link: linkThread(thread)
  };
}
