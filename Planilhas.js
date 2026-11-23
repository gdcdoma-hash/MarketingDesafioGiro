const DG_PLANILHA_MARKETING_RELACIONAMENTO_ID =
  '1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao';
const DG_LAB_MARKETING_SPREADSHEET_ID =
  '1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y';
const DG_LAB_PORTAL_SPREADSHEET_ID =
  '1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY';

/**
 * O LAB deve usar duas bases de teste distintas, sem dados pessoais reais.
 * Qualquer Script Property ausente no LAB interrompe o acesso às planilhas.
 * Nunca permitir, por engano, abrir as bases oficiais no ambiente LAB.
 */
function dg_configPlanilhas_() {
  const propriedades = PropertiesService.getScriptProperties();
  const ambiente = String(propriedades.getProperty('DG_AMBIENTE') || '')
    .trim().toUpperCase();
  if (!ambiente) throw new Error('Defina DG_AMBIENTE = PROD ou LAB antes de utilizar o sistema.');
  if (ambiente !== 'PROD' && ambiente !== 'LAB') {
    throw new Error('DG_AMBIENTE inválido; esperado PROD ou LAB.');
  }

  const portalConfigurado = String(
    propriedades.getProperty('DG_PORTAL_SPREADSHEET_ID') || ''
  ).trim();

  if (ambiente === 'LAB') {
    const marketingLab = String(
      propriedades.getProperty('DG_MARKETING_SPREADSHEET_ID') || ''
    ).trim();
    if (!marketingLab || !portalConfigurado) {
      throw new Error('LAB sem DG_MARKETING_SPREADSHEET_ID ou DG_PORTAL_SPREADSHEET_ID.');
    }
    if (marketingLab === DG_PLANILHA_MARKETING_RELACIONAMENTO_ID ||
        portalConfigurado === SPREADSHEET_ID ||
        marketingLab === portalConfigurado) {
      throw new Error('LAB não pode apontar para produção ou para uma única planilha.');
    }
    if (marketingLab !== DG_LAB_MARKETING_SPREADSHEET_ID ||
        portalConfigurado !== DG_LAB_PORTAL_SPREADSHEET_ID) {
      throw new Error('LAB deve usar somente as duas planilhas fictícias autorizadas.');
    }
    return { ambiente: ambiente, marketingId: marketingLab, portalId: portalConfigurado };
  }

  return {
    ambiente: ambiente,
    marketingId: DG_PLANILHA_MARKETING_RELACIONAMENTO_ID,
    portalId: portalConfigurado || SPREADSHEET_ID
  };
}

function dg_abrirPlanilhaPortal_() {
  return SpreadsheetApp.openById(dg_configPlanilhas_().portalId);
}

function dg_abrirPlanilhaMarketingRelacionamento_() {
  return SpreadsheetApp.openById(dg_configPlanilhas_().marketingId);
}
