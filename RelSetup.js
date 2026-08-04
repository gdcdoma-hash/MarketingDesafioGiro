/**
 * Cria somente as abas de relacionamento que ainda não existem.
 * Abas existentes são auditadas, mas nunca alteradas.
 */
function rel_configurarEstruturaInicial() {
  const planilha = dg_abrirPlanilhaMarketingRelacionamento_();
  const resumo = rel_listarEstruturas_().map(estrutura => {
    const abaExistente = planilha.getSheetByName(estrutura.NOME);

    if (abaExistente) {
      const problemas = rel_validarCabecalhos_(abaExistente, estrutura.CABECALHOS);
      return estrutura.NOME + ': já existia' +
        (problemas.length ? ' — ' + problemas.join('; ') : ' — OK');
    }

    const novaAba = planilha.insertSheet(estrutura.NOME);
    novaAba
      .getRange(1, 1, 1, estrutura.CABECALHOS.length)
      .setValues([estrutura.CABECALHOS.slice()])
      .setFontWeight('bold');
    novaAba.setFrozenRows(1);

    return estrutura.NOME + ': criada';
  }).join('\n');

  Logger.log(resumo);
  return resumo;
}

/**
 * Audita apenas a presença das abas e a estrutura da primeira linha.
 */
function rel_auditarEstrutura() {
  const planilha = dg_abrirPlanilhaMarketingRelacionamento_();
  const relatorio = rel_listarEstruturas_().map(estrutura => {
    const aba = planilha.getSheetByName(estrutura.NOME);

    if (!aba) {
      return estrutura.NOME + ': ERRO:\n- aba ausente';
    }

    const problemas = rel_validarCabecalhos_(aba, estrutura.CABECALHOS);
    if (!problemas.length) {
      return estrutura.NOME + ': OK';
    }

    return estrutura.NOME + ': ERRO:\n- ' + problemas.join('\n- ');
  }).join('\n');

  Logger.log(relatorio);
  return relatorio;
}

function rel_listarEstruturas_() {
  return Object.keys(REL_CONFIG.ABAS).map(chave => REL_CONFIG.ABAS[chave]);
}

function rel_validarCabecalhos_(aba, esperados) {
  const ultimaColuna = aba.getLastColumn();
  const quantidadeParaLeitura = Math.max(ultimaColuna, esperados.length);
  const encontrados = aba
    .getRange(1, 1, 1, quantidadeParaLeitura)
    .getDisplayValues()[0]
    .map(valor => String(valor || '').trim());
  const problemas = [];

  if (ultimaColuna !== esperados.length) {
    problemas.push(
      'quantidade de colunas: esperadas ' + esperados.length +
      ', encontradas ' + ultimaColuna
    );
  }

  esperados.forEach((cabecalho, indice) => {
    const posicoes = rel_encontrarPosicoes_(encontrados, cabecalho);

    if (!posicoes.length) {
      problemas.push('ausente: ' + cabecalho);
    } else if (encontrados[indice] !== cabecalho) {
      problemas.push(
        'posição incorreta: ' + cabecalho +
        ' (esperada ' + (indice + 1) + ', encontrada ' + posicoes[0] + ')'
      );
    }
  });

  encontrados.forEach(cabecalho => {
    if (cabecalho && esperados.indexOf(cabecalho) === -1) {
      problemas.push('adicional: ' + cabecalho);
    }
  });

  const jaVerificados = {};
  encontrados.forEach(cabecalho => {
    if (!cabecalho || jaVerificados[cabecalho]) return;
    jaVerificados[cabecalho] = true;

    const posicoes = rel_encontrarPosicoes_(encontrados, cabecalho);
    if (posicoes.length > 1) {
      problemas.push('duplicado: ' + cabecalho + ' (posições ' + posicoes.join(', ') + ')');
    }
  });

  return problemas;
}

function rel_encontrarPosicoes_(cabecalhos, procurado) {
  return cabecalhos.reduce((posicoes, cabecalho, indice) => {
    if (cabecalho === procurado) posicoes.push(indice + 1);
    return posicoes;
  }, []);
}
