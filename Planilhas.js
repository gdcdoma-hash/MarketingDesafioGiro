const DG_PLANILHA_MARKETING_RELACIONAMENTO_ID =
  '1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao';

/**
 * Fonte oficial do Portal: propriedade opcional DG_PORTAL_SPREADSHEET_ID.
 * Se não estiver definida, usa a planilha PROD validada em novembro/2026.
 * Nunca grava nessa fonte pelo módulo Marketing/Relacionamento.
 */
function dg_abrirPlanilhaPortal_() {
  const configurada = PropertiesService.getScriptProperties()
    .getProperty('DG_PORTAL_SPREADSHEET_ID');
  const id = String(configurada || '').trim() || SPREADSHEET_ID;
  return SpreadsheetApp.openById(id);
}

function dg_abrirPlanilhaMarketingRelacionamento_() {
  return SpreadsheetApp.openById(
    DG_PLANILHA_MARKETING_RELACIONAMENTO_ID
  );
}
