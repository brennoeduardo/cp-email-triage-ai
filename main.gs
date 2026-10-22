/**
 * =========================================================
 * FLUXO PRINCIPAL
 * =========================================================
 * Ponto de entrada chamado pelo gatilho de tempo (a cada 10 min).
 */
function executarFluxo() {

  // Evita que duas execuções rodem ao mesmo tempo (protege o rodízio).
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
    Logger.log("Outra execução já está em andamento. Abortando esta.");
    return;
  }

  try {
    Logger.log("========== INÍCIO ==========");

    const threads = buscarEmailsPendentes(CONFIG.MAX_THREADS);
    Logger.log(`Encontrados ${threads.length} e-mails para processar.`);

    const distribuidos = [];

    threads.forEach(thread => {
      try {
        const distribuicao = processarThread(thread);
        if (distribuicao) distribuidos.push(distribuicao);
      } catch (erro) {
        // Não perde o e-mail: marca com ERRO IA e deixa no inbox para revisão.
        Logger.log("Erro ao processar e-mail: " + erro);
        try {
          adicionarEtiqueta(thread, LABELS.ERRO_IA);
        } catch (e2) {
          Logger.log("Falha ao etiquetar como ERRO IA: " + e2);
        }
      }
    });

    // Um único aviso por execução, agrupado por responsável.
    // Falha no aviso nunca desfaz a distribuição já feita.
    try {
      notificarEquipe(distribuidos);
    } catch (erro) {
      Logger.log("Falha ao enviar aviso para a equipe: " + erro);
    }

    Logger.log("=========== FIM ===========");

  } finally {
    lock.releaseLock();
  }
}

/**
 * Processa uma única thread.
 * @returns {Object|null} dados da distribuição, ou null se não foi distribuída.
 */
function processarThread(thread) {

  // 1 - Já possui responsável? (segurança extra; normalmente já saiu do inbox)
  if (possuiResponsavel(thread)) {
    Logger.log("E-mail já distribuído. Apenas arquivando.");
    arquivarThread(thread);
    return null;
  }

  // 2 - Ler e-mail
  const email = obterDadosEmail(thread);
  Logger.log(`📧 ${email.assunto}`);

  // 3 - Classificar (pode lançar erro → tratado em executarFluxo)
  const resultado = classificarEmail(email);

  // 4 - Executar ação
  return executarAcao(thread, email, resultado);
}
