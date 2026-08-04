const REL_IMPORTACAO_ABAS_PROIBIDAS = Object.freeze([
  'DadosPessoais',
  'Marketing',
  'dgmbDesafios',
  'ListaDesafios',
  'Relacionamento_Contatos',
  'Relacionamento_Origens',
  'Relacionamento_ContatoOrigens',
  'Relacionamento_Historico',
  'Relacionamento_Cidades'
]);

function rel_importacao_obterPlanilha_() {
  return dg_abrirPlanilhaMarketingRelacionamento_();
}

function rel_importacao_obterAbaPorId_(idAba) {
  const id = Number(idAba);
  return rel_importacao_obterPlanilha_().getSheets()
    .find(item => item.getSheetId() === id);
}

function rel_importacao_listarAbasFonte_() {
  return rel_importacao_obterPlanilha_().getSheets()
    .filter(aba => !rel_importacao_abaProibida_(aba))
    .map(aba => ({ idAba: String(aba.getSheetId()), nomeAba: aba.getName() }));
}

function rel_importacao_abaProibida_(aba) {
  return aba.getName().indexOf('Relacionamento_') === 0 ||
    REL_IMPORTACAO_ABAS_PROIBIDAS.indexOf(aba.getName()) !== -1;
}

function rel_importacao_lerCabecalhosFonte_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (!ultimaColuna) return [];
  return aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0]
    .map((valor, indice) => ({
      indiceColuna: indice + 1,
      nomeColuna: String(valor || '').trim() || 'Coluna ' + (indice + 1)
    }));
}

function rel_importacao_lerColunaFonte_(aba, indiceColuna, primeiraLinhaDados) {
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < primeiraLinhaDados) return [];
  return aba.getRange(
    primeiraLinhaDados,
    indiceColuna,
    ultimaLinha - primeiraLinhaDados + 1,
    1
  )
    .getDisplayValues().map(linha => linha[0]);
}

function rel_importacao_obterTabela_(configuracao, obrigatorios) {
  const aba = rel_importacao_obterPlanilha_().getSheetByName(configuracao.NOME);
  if (!aba) throw new Error('A aba ' + configuracao.NOME + ' não foi encontrada.');
  const ultimaColuna = aba.getLastColumn();
  const mapa = {};
  if (ultimaColuna) {
    aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0]
      .forEach((valor, indice) => {
        const cabecalho = String(valor || '').trim();
        if (cabecalho) mapa[cabecalho] = indice;
      });
  }
  obrigatorios.forEach(cabecalho => {
    if (mapa[cabecalho] === undefined) {
      throw new Error('Cabeçalho obrigatório ausente: ' + cabecalho);
    }
  });
  return { aba: aba, mapa: mapa, ultimaColuna: ultimaColuna };
}

function rel_importacao_lerRegistros_(tabela, campos) {
  const ultimaLinha = tabela.aba.getLastRow();
  if (ultimaLinha < 2) return [];
  return tabela.aba.getRange(2, 1, ultimaLinha - 1, tabela.ultimaColuna).getValues()
    .map((linha, indice) => campos.reduce((registro, campo) => {
      registro[campo] = linha[tabela.mapa[campo]];
      registro.linha = indice + 2;
      return registro;
    }, {}));
}

function rel_importacao_inserirLinhas_(tabela, registros) {
  if (!registros.length) return;
  const linhas = registros.map(registro => {
    const linha = new Array(tabela.ultimaColuna).fill('');
    Object.keys(registro).forEach(campo => {
      if (tabela.mapa[campo] !== undefined) linha[tabela.mapa[campo]] = registro[campo];
    });
    return linha;
  });
  tabela.aba.getRange(tabela.aba.getLastRow() + 1, 1, linhas.length, tabela.ultimaColuna)
    .setValues(linhas);
}

function rel_importacao_atualizarContatos_(tabela, contatos, data) {
  if (!contatos.length) return;
  const quantidade = tabela.aba.getLastRow() - 1;
  const ultimaImportacao = tabela.aba
    .getRange(2, tabela.mapa.DATA_ULTIMA_IMPORTACAO + 1, quantidade, 1).getValues();
  const atualizadoEm = tabela.aba
    .getRange(2, tabela.mapa.ATUALIZADO_EM + 1, quantidade, 1).getValues();
  const exibicoes = tabela.aba
    .getRange(2, tabela.mapa.TELEFONE_EXIBICAO + 1, quantidade, 1).getValues();
  contatos.forEach(contato => {
    const indice = contato.linha - 2;
    ultimaImportacao[indice][0] = data;
    atualizadoEm[indice][0] = data;
    if (!String(exibicoes[indice][0] || '').trim()) {
      exibicoes[indice][0] = contato.telefoneExibicao;
    }
  });
  tabela.aba.getRange(2, tabela.mapa.DATA_ULTIMA_IMPORTACAO + 1, quantidade, 1)
    .setValues(ultimaImportacao);
  tabela.aba.getRange(2, tabela.mapa.ATUALIZADO_EM + 1, quantidade, 1)
    .setValues(atualizadoEm);
  tabela.aba.getRange(2, tabela.mapa.TELEFONE_EXIBICAO + 1, quantidade, 1)
    .setValues(exibicoes);
}

function rel_importacao_atualizarVinculos_(tabela, vinculos, data) {
  if (!vinculos.length) return;
  const quantidade = tabela.aba.getLastRow() - 1;
  const ultimaIdentificacao = tabela.aba
    .getRange(2, tabela.mapa.DATA_ULTIMA_IDENTIFICACAO + 1, quantidade, 1).getValues();
  const ocorrencias = tabela.aba
    .getRange(2, tabela.mapa.QUANTIDADE_OCORRENCIAS + 1, quantidade, 1).getValues();
  vinculos.forEach(item => {
    const indice = item.linha - 2;
    ultimaIdentificacao[indice][0] = data;
    ocorrencias[indice][0] = Number(ocorrencias[indice][0] || 0) + 1;
  });
  tabela.aba.getRange(2, tabela.mapa.DATA_ULTIMA_IDENTIFICACAO + 1, quantidade, 1)
    .setValues(ultimaIdentificacao);
  tabela.aba.getRange(2, tabela.mapa.QUANTIDADE_OCORRENCIAS + 1, quantidade, 1)
    .setValues(ocorrencias);
}
