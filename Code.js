const SPREADSHEET_ID = '18UCv96cqQMShaSabAhnX0AOLILAOcujCj-yBLUT1eJs';

const ABAS = {
  MARKETING: 'Marketing',
  DADOS_PESSOAIS: 'DadosPessoais',
  DESAFIOS: 'dgmbDesafios',
  LISTA_DESAFIOS: 'ListaDesafios'
};


/**
 * TESTE INICIAL
 *
 * Não altera nenhuma informação da planilha.
 * Apenas lê as quatro abas necessárias para o mini sistema de marketing.
 */
function testarConexaoMarketing() {
  const planilhaOperacional = dg_abrirPlanilhaMarketingRelacionamento_();
  const planilhaPortal = dg_abrirPlanilhaPortal_();

  const marketing = lerAbaComoObjetos_(planilhaOperacional, ABAS.MARKETING);
  const dadosPessoais = lerAbaComoObjetos_(planilhaPortal, ABAS.DADOS_PESSOAIS);
  const desafios = lerAbaComoObjetos_(planilhaPortal, ABAS.DESAFIOS);
  const listaDesafios = lerAbaComoObjetos_(planilhaPortal, ABAS.LISTA_DESAFIOS);

  Logger.log('=== TESTE MARKETING DESAFIO GIRO ===');
  Logger.log('Planilha operacional: ' + planilhaOperacional.getName());
  Logger.log('Planilha Portal: ' + planilhaPortal.getName());

  Logger.log('Marketing: ' + marketing.length + ' registros');
  Logger.log('DadosPessoais: ' + dadosPessoais.length + ' registros');
  Logger.log('dgmbDesafios: ' + desafios.length + ' registros');
  Logger.log('ListaDesafios: ' + listaDesafios.length + ' registros');

  Logger.log('--- Primeiro registro Marketing ---');
  Logger.log(JSON.stringify(marketing[0] || {}, null, 2));

  Logger.log('--- Primeiro registro DadosPessoais ---');
  Logger.log(JSON.stringify(dadosPessoais[0] || {}, null, 2));

  Logger.log('--- Última inscrição com REF_MARKETING ---');

  const inscricaoComRef = [...desafios]
    .reverse()
    .find(item => String(item.REF_MARKETING || '').trim() !== '');

  if (inscricaoComRef) {
    Logger.log(JSON.stringify({
      ID_DGMB: inscricaoComRef.ID_DGMB || '',
      Observacao: inscricaoComRef.Observacao || '',
      REF_MARKETING: inscricaoComRef.REF_MARKETING || '',
      id_desafio_lista_extraido: extrairIdDesafio_(inscricaoComRef.Observacao)
    }, null, 2));
  } else {
    Logger.log('Nenhuma inscrição com REF_MARKETING encontrada.');
  }

  Logger.log('=== FIM DO TESTE ===');
}


/**
 * Lê uma aba usando a primeira linha como cabeçalhos.
 *
 * Exemplo:
 * ID_DGMB | nome | Cidade-UF
 *
 * vira:
 *
 * {
 *   ID_DGMB: "...",
 *   nome: "...",
 *   "Cidade-UF": "..."
 * }
 */
function lerAbaComoObjetos_(ss, nomeAba) {
  const sheet = ss.getSheetByName(nomeAba);

  if (!sheet) {
    throw new Error('Aba não encontrada: ' + nomeAba);
  }

  const dados = sheet.getDataRange().getDisplayValues();

  if (dados.length < 2) {
    return [];
  }

  const cabecalhos = dados[0].map(valor => String(valor || '').trim());

  return dados
    .slice(1)
    .filter(linha => linha.some(valor => String(valor || '').trim() !== ''))
    .map(linha => {
      const obj = {};

      cabecalhos.forEach((cabecalho, indice) => {
        if (!cabecalho) return;
        obj[cabecalho] = linha[indice] || '';
      });

      return obj;
    });
}


/**
 * Extrai:
 *
 * [ID_DESAFIO:150]
 *
 * resultado:
 *
 * 150
 */
function extrairIdDesafio_(observacao) {
  const texto = String(observacao || '').trim();

  const match = texto.match(/\[ID_DESAFIO:(\d+)\]/i);

  return match ? match[1] : '';
}



function testarMetricasMarketing() {
  const planilhaOperacional = dg_abrirPlanilhaMarketingRelacionamento_();
  const planilhaPortal = dg_abrirPlanilhaPortal_();

  const marketing = lerAbaComoObjetos_(planilhaOperacional, ABAS.MARKETING);
  const dadosPessoais = lerAbaComoObjetos_(planilhaPortal, ABAS.DADOS_PESSOAIS);
  const desafios = lerAbaComoObjetos_(planilhaPortal, ABAS.DESAFIOS);
  const listaDesafios = lerAbaComoObjetos_(planilhaPortal, ABAS.LISTA_DESAFIOS);

  const pessoasPorId = {};
  dadosPessoais.forEach(item => {
    const id = String(item.ID_DGMB || '').trim();
    if (!id) return;
    pessoasPorId[id] = item;
  });

  const periodoPorDesafio = {};
  listaDesafios.forEach(item => {
    const id = String(item.id_Desafio_lista || '').trim();
    const periodo = String(item.Periodo || '').trim();

    if (!id) return;

    periodoPorDesafio[id] = periodo;
  });

  const metricasPorRef = {};

  marketing.forEach(item => {
    const ref = String(item.REF || '').trim();
    if (!ref) return;

    const idDgmb = String(item.ID_DGMB || '').trim();
    const pessoa = idDgmb ? pessoasPorId[idDgmb] : null;

    metricasPorRef[ref] = {
      ref: ref,
      idDgmb: idDgmb,
      nome: pessoa
        ? String(pessoa.nome || '').trim()
        : String(item.NOME_ORIGEM || '').trim(),
      cidadeUf: pessoa
        ? String(pessoa['Cidade-UF'] || '').trim()
        : '',
      whatsapp: pessoa
        ? String(pessoa.whatsapp || '').trim()
        : '',
      tipo: String(item.TIPO || '').trim(),
      status: String(item.STATUS || '').trim(),
      total: 0,
      periodos: {}
    };
  });

  desafios.forEach(inscricao => {
    const ref = String(inscricao.REF_MARKETING || '').trim();

    if (!ref) return;
    if (!metricasPorRef[ref]) return;

    const idDesafioLista = extrairIdDesafio_(inscricao.Observacao);
    const periodo = periodoPorDesafio[idDesafioLista] || 'SEM_PERIODO';

    metricasPorRef[ref].total++;

    if (!metricasPorRef[ref].periodos[periodo]) {
      metricasPorRef[ref].periodos[periodo] = 0;
    }

    metricasPorRef[ref].periodos[periodo]++;
  });

  const resultado = Object.values(metricasPorRef)
    .sort((a, b) => b.total - a.total);

  Logger.log('=== MÉTRICAS MARKETING DESAFIO GIRO ===');

  resultado.forEach(item => {
    Logger.log('-----------------------------------');
    Logger.log('REF: ' + item.ref);
    Logger.log('Nome: ' + (item.nome || '-'));
    Logger.log('Tipo: ' + (item.tipo || '-'));
    Logger.log('Status: ' + (item.status || '-'));
    Logger.log('Cidade: ' + (item.cidadeUf || '-'));
    Logger.log('WhatsApp: ' + (item.whatsapp || '-'));
    Logger.log('Total de inscrições: ' + item.total);

    const periodos = Object.keys(item.periodos);

    if (!periodos.length) {
      Logger.log('Períodos: nenhuma inscrição atribuída');
    } else {
      periodos
        .sort()
        .forEach(periodo => {
          Logger.log(
            periodo + ': ' + item.periodos[periodo] + ' inscrição(ões)'
          );
        });
    }
  });

  Logger.log('=== FIM DAS MÉTRICAS ===');
}



function diagnosticarPeriodoMarketing() {
  const planilhaPortal = dg_abrirPlanilhaPortal_();

  const lista = lerAbaComoObjetos_(planilhaPortal, ABAS.LISTA_DESAFIOS);
  const desafios = lerAbaComoObjetos_(planilhaPortal, ABAS.DESAFIOS);

  Logger.log('=== DIAGNÓSTICO DE PERÍODO ===');

  Logger.log('Primeiro registro ListaDesafios:');
  Logger.log(JSON.stringify(lista[0] || {}, null, 2));

  const inscricao = [...desafios]
    .reverse()
    .find(item => String(item.REF_MARKETING || '').trim() === '1145');

  if (!inscricao) {
    Logger.log('Não encontrei inscrição com REF_MARKETING = 1145');
    return;
  }

  const idExtraido = extrairIdDesafio_(inscricao.Observacao);

  Logger.log('Observacao da inscrição: ' + inscricao.Observacao);
  Logger.log('ID extraído: ' + idExtraido);

  const registroEncontrado = lista.find(item => {
    return Object.values(item).some(valor =>
      String(valor || '').trim() === String(idExtraido).trim()
    );
  });

  Logger.log('Registro da ListaDesafios contendo esse ID:');
  Logger.log(JSON.stringify(registroEncontrado || {}, null, 2));

  Logger.log('=== FIM DO DIAGNÓSTICO ===');
}

const META_MARKETING = 200;

const PORTAL_INSCRICAO_URL =
  'https://script.google.com/macros/s/AKfycby5Z_ogTZ9HtpXU66RyClIAPZn7LD1njpMWg0xLfdkMzOB01wLk70wN6HHime6J1eQHmA/exec';


function doGet() {
  const output = HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Marketing — Desafio Giro')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  output.addMetaTag(
    'viewport',
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
  );

  return output;
}

function include(nomeArquivo) {
  return HtmlService
    .createHtmlOutputFromFile(nomeArquivo)
    .getContent();
}


function obterDadosPainel(periodoSolicitado) {
  const planilhaOperacional = dg_abrirPlanilhaMarketingRelacionamento_();
  const planilhaPortal = dg_abrirPlanilhaPortal_();

  const marketing = lerAbaComoObjetos_(planilhaOperacional, ABAS.MARKETING);
  const pessoas = lerAbaComoObjetos_(planilhaPortal, ABAS.DADOS_PESSOAIS);
  const desafios = lerAbaComoObjetos_(planilhaPortal, ABAS.DESAFIOS);
  const lista = lerAbaComoObjetos_(planilhaPortal, ABAS.LISTA_DESAFIOS);

  const pessoasPorId = {};
  pessoas.forEach(item => {
    const id = String(item.ID_DGMB || '').trim();
    if (id) pessoasPorId[id] = item;
  });

  const periodoPorDesafio = {};
  const periodosSet = new Set();

  lista.forEach(item => {
    const id = String(item.id_Desafio_lista || '').trim();
    const periodo = String(item.Periodo || '').trim();

    if (id && periodo) {
      periodoPorDesafio[id] = periodo;
      periodosSet.add(periodo);
    }
  });

  const periodos = Array.from(periodosSet).sort((a, b) => {
    return chavePeriodo_(b) - chavePeriodo_(a);
  });

  const periodoSelecionado =
    String(periodoSolicitado || '').trim() ||
    periodos[0] ||
    '';

  const origens = {};

  marketing.forEach(item => {
    const ref = String(item.REF || '').trim();
    if (!ref) return;

    const idDgmb = String(item.ID_DGMB || '').trim();
    const pessoa = idDgmb ? pessoasPorId[idDgmb] : null;

    origens[ref] = {
      ref,
      idDgmb,
      nome: pessoa
        ? String(pessoa.nome || '').trim()
        : String(item.NOME_ORIGEM || ref).trim(),
      cidadeUf: pessoa
        ? String(pessoa['Cidade-UF'] || '').trim()
        : '',
      whatsapp: pessoa
        ? String(pessoa.whatsapp || '').trim()
        : '',
      tipo: String(item.TIPO || '').trim(),
      status: String(item.STATUS || '').trim(),
      inscricoes: 0,
      totalHistorico: 0,
      link: PORTAL_INSCRICAO_URL + '?ref=' + encodeURIComponent(ref)
    };
  });

  let totalPeriodo = 0;
  let totalAtribuidas = 0;
  let totalDireto = 0;
  const totaisPorTipo = {};
  const totaisPorCidade = {};
  const totaisPorUf = {};

  desafios.forEach(inscricao => {
    // Se houver uma inscrição explicitamente cancelada, não entra na métrica.
    const status = String(
      inscricao.Status_Usuario_Desafio ||
      inscricao.Status_Desafio ||
      ''
    ).toUpperCase();

    if (status.includes('CANCEL')) return;

    const ref = String(inscricao.REF_MARKETING || '').trim();

    if (ref && origens[ref]) {
      origens[ref].totalHistorico++;
    }

    const idDesafio = extrairIdDesafio_(inscricao.Observacao);
    const periodo = periodoPorDesafio[idDesafio] || '';

    if (periodo !== periodoSelecionado) return;

    totalPeriodo++;

    const origem = ref ? origens[ref] : null;
    const tipo = !ref
      ? 'DIRETO'
      : String(origem && origem.tipo || '').trim() || 'NAO_CLASSIFICADO';

    totaisPorTipo[tipo] = (totaisPorTipo[tipo] || 0) + 1;

    const idDgmb = String(inscricao.ID_DGMB || '').trim();
    const pessoa = idDgmb ? pessoasPorId[idDgmb] : null;
    const cidadeUf = String(pessoa && pessoa['Cidade-UF'] || '').trim();
    const cidade = cidadeUf || 'NÃO INFORMADO';
    const partesCidade = cidadeUf.split(' - ');
    const ufExtraida = partesCidade.length > 1
      ? String(partesCidade[partesCidade.length - 1] || '').trim().toUpperCase()
      : '';
    const uf = /^[A-Z]{2}$/.test(ufExtraida)
      ? ufExtraida
      : 'NÃO INFORMADO';

    totaisPorCidade[cidade] = (totaisPorCidade[cidade] || 0) + 1;
    totaisPorUf[uf] = (totaisPorUf[uf] || 0) + 1;

    if (!ref) {
      totalDireto++;
      return;
    }

    totalAtribuidas++;

    if (origens[ref]) {
      origens[ref].inscricoes++;
    }
  });

  const divulgadores = Object.values(origens)
    .sort((a, b) => {
      if (b.inscricoes !== a.inscricoes) {
        return b.inscricoes - a.inscricoes;
      }

      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

  const principaisOrigens = divulgadores
    .filter(item => item.inscricoes > 0)
    .slice(0, 10);

  const ordenarMetricas = totais => Object.keys(totais)
    .map(nome => ({ nome, inscricoes: totais[nome] }))
    .sort((a, b) => {
      if (b.inscricoes !== a.inscricoes) {
        return b.inscricoes - a.inscricoes;
      }

      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

  const metricasPorTipo = ordenarMetricas(totaisPorTipo);
  const metricasPorCidade = ordenarMetricas(totaisPorCidade);
  const metricasPorUf = ordenarMetricas(totaisPorUf);

  const percentualMeta = META_MARKETING > 0
    ? Math.min(100, (totalPeriodo / META_MARKETING) * 100)
    : 0;

  return {
    periodoSelecionado,
    periodos,
    meta: META_MARKETING,
    totalPeriodo,
    totalAtribuidas,
    totalDireto,
    percentualMeta,
    divulgadores,
    principaisOrigens,
    metricasPorTipo,
    metricasPorCidade,
    metricasPorUf
  };
}


function chavePeriodo_(periodo) {
  const match = String(periodo || '')
    .trim()
    .match(/^(\d{1,2}|[A-Za-zÀ-ÿ]+)\/(\d{4})$/);

  if (!match) return 0;

  const meses = {
    janeiro: 1,
    fevereiro: 2,
    março: 3,
    marco: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12
  };

  const parteMes = match[1].toLowerCase();
  const mes = Number(parteMes) || meses[parteMes] || 0;
  const ano = Number(match[2]) || 0;

  return (ano * 100) + mes;
}

function buscarPessoasMarketing(termoBusca) {
  const termo = normalizarBuscaMarketing_(termoBusca);

  if (!termo) {
    return {
      status: 'ERRO',
      mensagem: 'Informe um nome ou código.'
    };
  }

  const planilhaPortal = dg_abrirPlanilhaPortal_();

  const pessoas = lerAbaComoObjetos_(
    planilhaPortal,
    ABAS.DADOS_PESSOAIS
  );

  const resultados = pessoas
    .filter(item => {
      const id = normalizarBuscaMarketing_(
        item.ID_DGMB
      );

      const nome = normalizarBuscaMarketing_(
        item.nome
      );

      return (
        id === termo ||
        id.includes(termo) ||
        nome.includes(termo)
      );
    })
    .sort((a, b) => {
      const idA = normalizarBuscaMarketing_(
        a.ID_DGMB
      );

      const idB = normalizarBuscaMarketing_(
        b.ID_DGMB
      );

      // Código exato vem primeiro.
      if (idA === termo && idB !== termo) return -1;
      if (idB === termo && idA !== termo) return 1;

      return String(a.nome || '').localeCompare(
        String(b.nome || ''),
        'pt-BR'
      );
    })
    .slice(0, 20)
    .map(item => ({
      idDgmb: String(item.ID_DGMB || '').trim(),
      nome: String(item.nome || '').trim(),
      cidadeUf: String(
        item['Cidade-UF'] || ''
      ).trim(),
      whatsapp: String(
        item.whatsapp || ''
      ).trim()
    }));

  if (!resultados.length) {
    return {
      status: 'NAO_ENCONTRADO',
      mensagem: 'Nenhum participante encontrado.'
    };
  }

  return {
    status: 'OK',
    resultados: resultados
  };
}


function normalizarBuscaMarketing_(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


function salvarDivulgadorMarketing(dados) {
  const idDgmb = String(
    dados && dados.idDgmb || ''
  ).trim();

  const tipo = String(
    dados && dados.tipo || ''
  ).trim().toUpperCase();

  if (!idDgmb) {
    return {
      status: 'ERRO',
      mensagem: 'Código não informado.'
    };
  }

  const tiposPermitidos = [
    'ADMIN',
    'PARTICIPANTE',
    'APOIADOR',
    'GRUPO'
  ];

  if (!tiposPermitidos.includes(tipo)) {
    return {
      status: 'ERRO',
      mensagem: 'Tipo de divulgador inválido.'
    };
  }

  const planilhaPortal = dg_abrirPlanilhaPortal_();

  const pessoas = lerAbaComoObjetos_(
    planilhaPortal,
    ABAS.DADOS_PESSOAIS
  );

  const pessoa = pessoas.find(item =>
    String(item.ID_DGMB || '').trim() === idDgmb
  );

  if (!pessoa) {
    return {
      status: 'ERRO',
      mensagem: 'Código não encontrado em DadosPessoais.'
    };
  }

  const planilhaOperacional = dg_abrirPlanilhaMarketingRelacionamento_();
  const sheet = planilhaOperacional.getSheetByName(ABAS.MARKETING);

  if (!sheet) {
    return {
      status: 'ERRO',
      mensagem: 'Aba Marketing não encontrada.'
    };
  }

  const registros = lerAbaComoObjetos_(
    planilhaOperacional,
    ABAS.MARKETING
  );

  const jaExiste = registros.some(item =>
    String(item.REF || '').trim() === idDgmb ||
    String(item.ID_DGMB || '').trim() === idDgmb
  );

  if (jaExiste) {
    return {
      status: 'DUPLICADO',
      mensagem: 'Este divulgador já está cadastrado.'
    };
  }

  sheet.appendRow([
    idDgmb,
    idDgmb,
    '',
    tipo,
    'ATIVO'
  ]);

  return {
    status: 'OK',
    mensagem: 'Divulgador cadastrado.',
    nome: String(pessoa.nome || '').trim(),
    cidadeUf: String(pessoa['Cidade-UF'] || '').trim(),
    tipo: tipo,
    link: PORTAL_INSCRICAO_URL + '?ref=' + encodeURIComponent(idDgmb)
  };
}


function alterarStatusOrigemMarketing(ref, novoStatus) {
  const refNormalizada = String(ref || '').trim();
  const statusNormalizado = String(novoStatus || '').trim().toUpperCase();

  if (!refNormalizada) {
    return {
      status: 'ERRO',
      mensagem: 'REF não informada.'
    };
  }

  if (!['ATIVO', 'INATIVO'].includes(statusNormalizado)) {
    return {
      status: 'ERRO',
      mensagem: 'Status inválido.'
    };
  }

  const planilhaOperacional = dg_abrirPlanilhaMarketingRelacionamento_();
  const sheet = planilhaOperacional.getSheetByName(ABAS.MARKETING);

  if (!sheet) {
    return {
      status: 'ERRO',
      mensagem: 'Aba Marketing não encontrada.'
    };
  }

  const dados = sheet.getDataRange().getDisplayValues();
  const cabecalhos = (dados[0] || []).map(valor =>
    String(valor || '').trim()
  );
  const indiceRef = cabecalhos.indexOf('REF');
  const indiceStatus = cabecalhos.indexOf('STATUS');

  if (indiceRef === -1 || indiceStatus === -1) {
    return {
      status: 'ERRO',
      mensagem: 'Cabeçalhos REF ou STATUS não encontrados.'
    };
  }

  const indiceLinha = dados.findIndex((linha, indice) =>
    indice > 0 &&
    String(linha[indiceRef] || '').trim() === refNormalizada
  );

  if (indiceLinha === -1) {
    return {
      status: 'NAO_ENCONTRADO',
      mensagem: 'REF não encontrada na aba Marketing.'
    };
  }

  sheet
    .getRange(indiceLinha + 1, indiceStatus + 1)
    .setValue(statusNormalizado);

  return {
    status: 'OK',
    mensagem: 'Status atualizado.',
    novoStatus: statusNormalizado
  };
}
