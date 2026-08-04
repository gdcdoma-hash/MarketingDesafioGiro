const DG_PLANILHA_MARKETING_RELACIONAMENTO_ID =
  '1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao';

function dg_abrirPlanilhaPortal_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function dg_abrirPlanilhaMarketingRelacionamento_() {
  return SpreadsheetApp.openById(
    DG_PLANILHA_MARKETING_RELACIONAMENTO_ID
  );
}
