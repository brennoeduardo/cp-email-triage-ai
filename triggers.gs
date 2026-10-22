/**
 * =========================================================
 * GATILHO DE TEMPO (CRON NATIVO)
 * =========================================================
 * Rode instalarGatilho() UMA vez, manualmente, no editor do Apps Script.
 * Ele cria um gatilho que chama executarFluxo() a cada 10 minutos.
 * Chamar de novo NÃO duplica: os gatilhos antigos são removidos antes.
 */

const FUNCAO_GATILHO = "executarFluxo";
const INTERVALO_MINUTOS = 10;

/**
 * Instala (ou reinstala) o gatilho de 10 minutos.
 */
function instalarGatilho() {
  removerGatilhos();

  ScriptApp.newTrigger(FUNCAO_GATILHO)
    .timeBased()
    .everyMinutes(INTERVALO_MINUTOS)
    .create();

  Logger.log(`Gatilho instalado: ${FUNCAO_GATILHO}() a cada ${INTERVALO_MINUTOS} minutos.`);
}

/**
 * Remove todos os gatilhos que apontam para executarFluxo().
 */
function removerGatilhos() {
  const gatilhos = ScriptApp.getProjectTriggers();
  let removidos = 0;

  gatilhos.forEach(g => {
    if (g.getHandlerFunction() === FUNCAO_GATILHO) {
      ScriptApp.deleteTrigger(g);
      removidos++;
    }
  });

  Logger.log(`Gatilhos removidos: ${removidos}`);
}

/**
 * Lista os gatilhos atuais do projeto (útil para conferência).
 */
function listarGatilhos() {
  const gatilhos = ScriptApp.getProjectTriggers();
  Logger.log(`Total de gatilhos: ${gatilhos.length}`);
  gatilhos.forEach(g => {
    Logger.log(`- ${g.getHandlerFunction()} (${g.getEventType()})`);
  });
}