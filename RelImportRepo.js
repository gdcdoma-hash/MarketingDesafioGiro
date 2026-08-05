function rel_importacao_obterPlanilha_() {
  return dg_abrirPlanilhaMarketingRelacionamento_();
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
    const naoContatar = String(contato.ETAPA || '').trim().toUpperCase() === 'NAO_CONTATAR';
    ultimaImportacao[indice][0] = data;
    if (naoContatar) return;
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
