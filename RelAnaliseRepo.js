const REL_ANALISE_CABECALHOS_CONTATOS = Object.freeze([
  'TELEFONE_NORMALIZADO', 'ID_DGMB', 'NOME_PORTAL', 'CIDADE_UF_PORTAL',
  'CIDADE', 'UF', 'DATA_ANALISE', 'ATUALIZADO_EM'
]);
const REL_ANALISE_CABECALHOS_PORTAL = Object.freeze([
  'ID_DGMB', 'Nome', 'Cidade-UF', 'Telefone'
]);

function rel_analise_lerTabela_(planilha, nomeAba, cabecalhos, codigoErro) {
  const aba = planilha.getSheetByName(nomeAba);
  if (!aba) throw new Error(codigoErro);
  const valores = aba.getDataRange().getValues();
  const cabecalho = valores.length ? valores[0] : [];
  const mapa = {};
  cabecalho.forEach((valor, indice) => {
    const nome = String(valor || '').trim();
    if (nome) mapa[nome] = indice;
  });
  if (cabecalhos.some(nome => mapa[nome] === undefined)) throw new Error(codigoErro);
  return { aba: aba, mapa: mapa, linhas: valores.slice(1) };
}

function rel_analise_lerBases_() {
  const contatos = rel_analise_lerTabela_(
    dg_abrirPlanilhaMarketingRelacionamento_(),
    'Relacionamento_Contatos',
    REL_ANALISE_CABECALHOS_CONTATOS,
    'ESTRUTURA_CONTATOS_INVALIDA'
  );
  const portal = rel_analise_lerTabela_(
    dg_abrirPlanilhaPortal_(),
    'DadosPessoais',
    REL_ANALISE_CABECALHOS_PORTAL,
    'ESTRUTURA_DADOS_PESSOAIS_INVALIDA'
  );
  return { contatos: contatos, portal: portal };
}

function rel_analise_gravarContatos_(tabela, colunas) {
  if (!tabela.linhas.length) return;
  Object.keys(colunas).forEach(cabecalho => {
    colunas[cabecalho].forEach((valor, indice) => {
      tabela.linhas[indice][tabela.mapa[cabecalho]] = valor[0];
    });
  });
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    tabela.aba.getRange(2, 1, tabela.linhas.length, tabela.linhas[0].length)
      .setValues(tabela.linhas);
  } finally {
    lock.releaseLock();
  }
}
