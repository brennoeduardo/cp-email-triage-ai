/**
 * =========================================================
 * DISTRIBUIÇÃO (RODÍZIO / ROUND-ROBIN)
 * =========================================================
 * O índice do último responsável fica salvo em ScriptProperties.
 * A atomicidade é garantida pelo LockService em executarFluxo().
 */

/**
 * Apenas visualiza quem seria o próximo, SEM avançar o rodízio.
 * Usado no modo simulação.
 * @returns {string}
 */
function visualizarProximoResponsavel() {
  const props = PropertiesService.getScriptProperties();
  const ultimoIndice = Number(props.getProperty("ULTIMO_RESPONSAVEL") ?? -1);
  const proximoIndice = (ultimoIndice + 1) % RESPONSAVEIS.length;
  return RESPONSAVEIS[proximoIndice];
}

/**
 * Retorna o próximo responsável do rodízio e AVANÇA o ponteiro.
 * @returns {string}
 */
function obterProximoResponsavel() {
  const props = PropertiesService.getScriptProperties();
  const ultimoIndice = Number(props.getProperty("ULTIMO_RESPONSAVEL") ?? -1);
  const proximoIndice = (ultimoIndice + 1) % RESPONSAVEIS.length;
  props.setProperty("ULTIMO_RESPONSAVEL", String(proximoIndice));
  return RESPONSAVEIS[proximoIndice];
}

/**
 * Distribui uma thread para o próximo responsável (aplica a etiqueta).
 * @returns {string} nome do responsável
 */
function distribuirThread(thread) {
  const responsavel = obterProximoResponsavel();
  adicionarEtiqueta(thread, responsavel);
  return responsavel;
}

/**
 * Reseta o rodízio (útil em testes). Rode manualmente se precisar.
 */
function resetarRodizio() {
  PropertiesService.getScriptProperties().deleteProperty("ULTIMO_RESPONSAVEL");
  Logger.log("Rodízio resetado. Próximo será: " + RESPONSAVEIS[0]);
}