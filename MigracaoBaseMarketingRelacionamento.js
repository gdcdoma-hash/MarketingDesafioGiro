/**
 * Copia com segurança a base operacional para a planilha exclusiva.
 * Esta função administrativa deve ser executada manualmente.
 */
function dg_migrarBaseMarketingRelacionamento() {
  dg_validarConfiguracaoPlanilhas_();
  const portal = dg_abrirPlanilhaPortal_();
  const destino = dg_abrirPlanilhaMarketingRelacionamento_();
  if (!portal || !destino || portal.getId() === destino.getId()) {
    throw new Error('Não foi possível validar as planilhas de origem e destino.');
  }

  const origemMarketing = portal.getSheetByName(ABAS.MARKETING);
  if (!origemMarketing) throw new Error('A aba Marketing não existe na planilha principal.');

  const linhas = origemMarketing.getLastRow();
  const colunas = origemMarketing.getLastColumn();
  const relatorio = ['=== MIGRAÇÃO MARKETING/RELACIONAMENTO ===', '', 'Marketing:'];
  let destinoMarketing = destino.getSheetByName(ABAS.MARKETING);

  if (!destinoMarketing) {
    destinoMarketing = origemMarketing.copyTo(destino).setName(ABAS.MARKETING);
    relatorio.push('- copiada com sucesso');
  } else if (dg_abaEstaTotalmenteVazia_(destinoMarketing)) {
    dg_copiarConteudoAba_(origemMarketing, destinoMarketing);
    relatorio.push('- aba existente e vazia preenchida com segurança');
  } else {
    relatorio.push('- já existia e possuía dados; não foi alterada');
  }
  relatorio.push('- ' + linhas + ' linhas');
  relatorio.push('- ' + colunas + ' colunas');

  rel_listarEstruturas_().forEach(estrutura => {
    relatorio.push('', estrutura.NOME + ':');
    const aba = destino.getSheetByName(estrutura.NOME);
    if (!aba) {
      const novaAba = destino.insertSheet(estrutura.NOME);
      novaAba.getRange(1, 1, 1, estrutura.CABECALHOS.length)
        .setValues([estrutura.CABECALHOS.slice()])
        .setFontWeight('bold');
      novaAba.setFrozenRows(1);
      relatorio.push('- criada');
      return;
    }
    const problemas = rel_validarCabecalhos_(aba, estrutura.CABECALHOS);
    relatorio.push(problemas.length
      ? '- já existia; diferenças: ' + problemas.join('; ')
      : '- já existia; cabeçalhos OK');
  });

  const oficiais = [ABAS.MARKETING].concat(
    rel_listarEstruturas_().map(estrutura => estrutura.NOME)
  );
  destino.getSheets().forEach(aba => {
    if (oficiais.indexOf(aba.getName()) === -1) {
      relatorio.push('', aba.getName() + ':', dg_abaEstaTotalmenteVazia_(aba)
        ? '- aba não oficial vazia mantida por segurança'
        : '- aba não oficial com conteúdo mantida');
    }
  });

  relatorio.push('', 'Planilha principal:', '- nenhuma aba alterada',
    '- nenhuma aba excluída', '', 'Resultado:', '- migração concluída');
  const resumo = relatorio.join('\n');
  Logger.log(resumo);
  return resumo;
}

/** Função administrativa de auditoria, exclusivamente de leitura. */
function dg_auditarBaseMarketingRelacionamento() {
  dg_validarConfiguracaoPlanilhas_();
  const portal = dg_abrirPlanilhaPortal_();
  const destino = dg_abrirPlanilhaMarketingRelacionamento_();
  const relatorio = ['=== AUDITORIA MARKETING/RELACIONAMENTO ==='];
  const origemMarketing = portal.getSheetByName(ABAS.MARKETING);
  const destinoMarketing = destino.getSheetByName(ABAS.MARKETING);

  if (!origemMarketing || !destinoMarketing) {
    relatorio.push('Marketing: ERRO — aba ausente na ' +
      (!origemMarketing ? 'planilha principal' : 'planilha operacional'));
  } else {
    const diferencas = dg_compararAbasMarketing_(origemMarketing, destinoMarketing);
    relatorio.push('Marketing: ' + (diferencas.length ? 'ERRO' : 'OK'));
    diferencas.forEach(item => relatorio.push('- ' + item));
    relatorio.push('- origem: ' + origemMarketing.getLastRow() + ' linhas, ' +
      origemMarketing.getLastColumn() + ' colunas');
    relatorio.push('- destino: ' + destinoMarketing.getLastRow() + ' linhas, ' +
      destinoMarketing.getLastColumn() + ' colunas');
  }

  rel_listarEstruturas_().forEach(estrutura => {
    const aba = destino.getSheetByName(estrutura.NOME);
    if (!aba) {
      relatorio.push(estrutura.NOME + ': ERRO — aba ausente');
      return;
    }
    const problemas = rel_validarCabecalhos_(aba, estrutura.CABECALHOS);
    relatorio.push(estrutura.NOME + ': ' + (problemas.length ? 'ERRO' : 'OK'));
    problemas.forEach(item => relatorio.push('- ' + item));
  });

  const resumo = relatorio.join('\n');
  Logger.log(resumo);
  return resumo;
}

/**
 * Remove exclusivamente as abas antigas de Relacionamento da planilha do Portal.
 * Função administrativa manual: não é chamada pelo front-end nem por gatilhos.
 */
function dg_removerAbasAntigasRelacionamentoPortal() {
  dg_validarConfiguracaoPlanilhas_();
  const portal = dg_abrirPlanilhaPortal_();
  const operacional = dg_abrirPlanilhaMarketingRelacionamento_();
  if (!portal || !operacional || portal.getId() === operacional.getId()) {
    throw new Error('Limpeza interrompida: não foi possível distinguir as duas planilhas.');
  }

  const estruturas = [
    REL_CONFIG.ABAS.CONTATOS,
    REL_CONFIG.ABAS.ORIGENS,
    REL_CONFIG.ABAS.CONTATO_ORIGENS,
    REL_CONFIG.ABAS.HISTORICO,
    REL_CONFIG.ABAS.CIDADES
  ];
  const nomesPermitidos = [
    'Relacionamento_Contatos',
    'Relacionamento_Origens',
    'Relacionamento_ContatoOrigens',
    'Relacionamento_Historico',
    'Relacionamento_Cidades',
    'Rel_EntradaContatos'
  ];
  const relatorio = [
    '=== LIMPEZA DAS ABAS ANTIGAS DO PORTAL ===',
    '',
    'Validação da base operacional:'
  ];

  estruturas.forEach(estrutura => {
    const aba = operacional.getSheetByName(estrutura.NOME);
    if (!aba) {
      throw new Error('Limpeza interrompida: aba operacional ausente: ' + estrutura.NOME + '.');
    }
    const problemas = rel_validarCabecalhos_(aba, estrutura.CABECALHOS);
    if (problemas.length) {
      throw new Error('Limpeza interrompida: ' + estrutura.NOME + ': ' + problemas.join('; '));
    }
    relatorio.push('- ' + estrutura.NOME + ': OK');
  });

  dg_validarDadosAntigosContidos_(
    portal,
    operacional,
    REL_CONFIG.ABAS.CONTATOS.NOME,
    ['TELEFONE_NORMALIZADO']
  );
  dg_validarDadosAntigosContidos_(
    portal,
    operacional,
    REL_CONFIG.ABAS.CONTATO_ORIGENS.NOME,
    ['TELEFONE_NORMALIZADO', 'ID_ORIGEM'],
    'QUANTIDADE_OCORRENCIAS'
  );

  relatorio.push('', 'Planilha principal:');
  nomesPermitidos.forEach(nome => {
    const aba = portal.getSheetByName(nome);
    if (!aba) {
      relatorio.push('- ' + nome + ': ausente');
      return;
    }
    portal.deleteSheet(aba);
    relatorio.push('- ' + nome + ': removida');
  });
  relatorio.push('', 'Abas protegidas:', '- nenhuma alteração');
  const resumo = relatorio.join('\n');
  Logger.log(resumo);
  return resumo;
}

function dg_validarDadosAntigosContidos_(portal, operacional, nomeAba, camposChave, campoQuantidade) {
  const antiga = portal.getSheetByName(nomeAba);
  if (!antiga || !dg_abaPossuiDados_(antiga)) return;
  const oficial = operacional.getSheetByName(nomeAba);
  const registrosAntigos = dg_mapearRegistrosLimpeza_(antiga, camposChave, campoQuantidade);
  const registrosOficiais = dg_mapearRegistrosLimpeza_(oficial, camposChave, campoQuantidade);

  Object.keys(registrosAntigos).forEach(chave => {
    if (registrosOficiais[chave] === undefined) {
      throw new Error('Limpeza interrompida: registro da aba antiga ' + nomeAba +
        ' não existe na base operacional (' + chave + ').');
    }
    if (campoQuantidade && registrosOficiais[chave] < registrosAntigos[chave]) {
      throw new Error('Limpeza interrompida: quantidade divergente em ' + nomeAba +
        ' (' + chave + ').');
    }
  });
}

function dg_abaPossuiDados_(aba) {
  if (aba.getLastRow() < 2 || !aba.getLastColumn()) return false;
  return aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn())
    .getDisplayValues().some(linha => linha.some(valor => String(valor || '').trim()));
}

function dg_mapearRegistrosLimpeza_(aba, camposChave, campoQuantidade) {
  const ultimaColuna = aba.getLastColumn();
  const cabecalhos = aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0];
  const mapa = {};
  cabecalhos.forEach((cabecalho, indice) => { mapa[String(cabecalho || '').trim()] = indice; });
  camposChave.concat(campoQuantidade ? [campoQuantidade] : []).forEach(campo => {
    if (mapa[campo] === undefined) {
      throw new Error('Limpeza interrompida: cabeçalho ' + campo + ' ausente em ' + aba.getName() + '.');
    }
  });

  const registros = {};
  if (aba.getLastRow() < 2) return registros;
  aba.getRange(2, 1, aba.getLastRow() - 1, ultimaColuna).getDisplayValues().forEach(linha => {
    if (!linha.some(valor => String(valor || '').trim())) return;
    const chave = camposChave.map(campo => String(linha[mapa[campo]] || '').trim()).join('|');
    if (!chave || chave.split('|').some(parte => !parte)) {
      throw new Error('Limpeza interrompida: registro sem chave em ' + aba.getName() + '.');
    }
    if (registros[chave] !== undefined) {
      throw new Error('Limpeza interrompida: chave duplicada em ' + aba.getName() + ' (' + chave + ').');
    }
    registros[chave] = campoQuantidade ? Number(linha[mapa[campoQuantidade]] || 0) : true;
    if (campoQuantidade && (!Number.isFinite(registros[chave]) || registros[chave] < 0)) {
      throw new Error('Limpeza interrompida: quantidade inválida em ' + aba.getName() + ' (' + chave + ').');
    }
  });
  return registros;
}

function dg_validarConfiguracaoPlanilhas_() {
  if (!DG_PLANILHA_MARKETING_RELACIONAMENTO_ID ||
      DG_PLANILHA_MARKETING_RELACIONAMENTO_ID === SPREADSHEET_ID) {
    throw new Error('ID da planilha operacional inválido.');
  }
}

function dg_abaEstaTotalmenteVazia_(aba) {
  if (aba.getLastRow() === 0 || aba.getLastColumn() === 0) return true;
  const intervalo = aba.getDataRange();
  const valores = intervalo.getDisplayValues();
  const formulas = intervalo.getFormulas();
  return !valores.some(linha => linha.some(valor => String(valor || '') !== '')) &&
    !formulas.some(linha => linha.some(formula => String(formula || '') !== ''));
}

function dg_copiarConteudoAba_(origem, destino) {
  const linhas = origem.getMaxRows();
  const colunas = origem.getMaxColumns();
  if (destino.getMaxRows() < linhas) {
    destino.insertRowsAfter(destino.getMaxRows(), linhas - destino.getMaxRows());
  }
  if (destino.getMaxColumns() < colunas) {
    destino.insertColumnsAfter(destino.getMaxColumns(), colunas - destino.getMaxColumns());
  }
  origem.getRange(1, 1, linhas, colunas).copyTo(destino.getRange(1, 1));
  for (let coluna = 1; coluna <= colunas; coluna++) {
    destino.setColumnWidth(coluna, origem.getColumnWidth(coluna));
  }
  destino.setFrozenRows(origem.getFrozenRows());
  destino.setFrozenColumns(origem.getFrozenColumns());
}

function dg_compararAbasMarketing_(origem, destino) {
  const diferencas = [];
  const linhasOrigem = origem.getLastRow();
  const linhasDestino = destino.getLastRow();
  const colunasOrigem = origem.getLastColumn();
  const colunasDestino = destino.getLastColumn();
  if (linhasOrigem !== linhasDestino) diferencas.push('quantidade de linhas diferente');
  if (colunasOrigem !== colunasDestino) diferencas.push('quantidade de colunas diferente');
  if (!linhasOrigem || !colunasOrigem || !linhasDestino || !colunasDestino) return diferencas;

  const colunasComparacao = Math.max(colunasOrigem, colunasDestino);
  const cabecalhosOrigem = origem.getRange(1, 1, 1, colunasOrigem).getDisplayValues()[0];
  const cabecalhosDestino = destino.getRange(1, 1, 1, colunasDestino).getDisplayValues()[0];
  if (JSON.stringify(cabecalhosOrigem) !== JSON.stringify(cabecalhosDestino)) {
    diferencas.push('cabeçalhos diferentes');
  }
  if (linhasOrigem === linhasDestino && colunasOrigem === colunasDestino) {
    const faixaOrigem = origem.getRange(1, 1, linhasOrigem, colunasComparacao);
    const faixaDestino = destino.getRange(1, 1, linhasDestino, colunasComparacao);
    if (JSON.stringify(faixaOrigem.getDisplayValues()) !==
        JSON.stringify(faixaDestino.getDisplayValues())) diferencas.push('valores exibidos diferentes');
    if (JSON.stringify(faixaOrigem.getFormulas()) !==
        JSON.stringify(faixaDestino.getFormulas())) diferencas.push('fórmulas diferentes');
  } else {
    diferencas.push('valores e fórmulas não comparados devido às dimensões diferentes');
  }
  return diferencas;
}
