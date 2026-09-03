const CHAVE_METAS_MARKETING_V2 = 'METAS_MARKETING_V2';

function mdg_normalizarCabecalho_(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function mdg_valorCampo_(obj, nomes) {
  const mapa = {};
  Object.keys(obj || {}).forEach(chave => {
    mapa[mdg_normalizarCabecalho_(chave)] = obj[chave];
  });

  for (let i = 0; i < nomes.length; i++) {
    const valor = mapa[mdg_normalizarCabecalho_(nomes[i])];
    if (String(valor || '').trim() !== '') return String(valor).trim();
  }

  return '';
}

function mdg_tipoDesafio_(item) {
  const explicito = mdg_valorCampo_(item, [
    'TIPO', 'Tipo', 'Tipo_Desafio', 'tipo_desafio', 'Modalidade', 'Categoria'
  ]).toUpperCase();
  const texto = (explicito + ' ' + Object.values(item || {}).join(' ')).toUpperCase();

  if (texto.includes('REPESC')) return 'REPESCAGEM';
  if (texto.includes('PRAZO') || texto.includes('DIAS')) return 'POR PRAZO';
  if (explicito) return explicito;
  return 'NORMAL';
}

function mdg_catalogoDesafios_(lista) {
  const mapa = {};

  (lista || []).forEach(item => {
    const id = String(item.id_Desafio_lista || '').trim();
    if (!id) return;

    const periodo = String(item.Periodo || '').trim();
    const codigo = mdg_valorCampo_(item, [
      'COD', 'CODIGO', 'Código', 'Codigo', 'COD_DESAFIO', 'Codigo_Desafio',
      'codigo_desafio', 'ID_DESAFIO_BASE', 'id_desafio_base'
    ]) || id;
    const nome = mdg_valorCampo_(item, [
      'NOME', 'Nome', 'NOME_DESAFIO', 'Nome_Desafio', 'nome_desafio',
      'DESAFIO', 'Desafio', 'DESCRICAO', 'Descrição', 'Descricao', 'Titulo', 'Título'
    ]) || ('Desafio ' + codigo);

    mapa[id] = {
      id,
      codigo,
      nome,
      periodo,
      tipo: mdg_tipoDesafio_(item)
    };
  });

  return mapa;
}

function mdg_obterMetas_() {
  const texto = PropertiesService.getScriptProperties().getProperty(CHAVE_METAS_MARKETING_V2);
  if (!texto) return {};

  try {
    const dados = JSON.parse(texto);
    return dados && typeof dados === 'object' ? dados : {};
  } catch (e) {
    return {};
  }
}

function salvarMetasMarketingV2(dados) {
  const periodo = String(dados && dados.periodo || '').trim();
  if (!periodo) {
    return { status: 'ERRO', mensagem: 'Período não informado.' };
  }

  const metaGeral = Math.max(0, Number(dados && dados.metaGeral) || 0);
  const metasRecebidas = dados && dados.metasDesafios || {};
  const metasDesafios = {};

  Object.keys(metasRecebidas).forEach(id => {
    const valor = Math.max(0, Number(metasRecebidas[id]) || 0);
    if (valor > 0) metasDesafios[String(id)] = valor;
  });

  const todas = mdg_obterMetas_();
  todas[periodo] = {
    geral: metaGeral,
    desafios: metasDesafios
  };

  PropertiesService
    .getScriptProperties()
    .setProperty(CHAVE_METAS_MARKETING_V2, JSON.stringify(todas));

  return {
    status: 'OK',
    mensagem: 'Metas atualizadas.',
    periodo,
    metaGeral,
    metasDesafios
  };
}

function obterDadosPainelMarketingV2(periodoSolicitado, idDesafioSolicitado) {
  const planilhaOperacional = dg_abrirPlanilhaMarketingRelacionamento_();
  const planilhaPortal = dg_abrirPlanilhaPortal_();

  const marketing = lerAbaComoObjetos_(planilhaOperacional, ABAS.MARKETING);
  const pessoas = lerAbaComoObjetos_(planilhaPortal, ABAS.DADOS_PESSOAIS);
  const inscricoes = lerAbaComoObjetos_(planilhaPortal, ABAS.DESAFIOS);
  const lista = lerAbaComoObjetos_(planilhaPortal, ABAS.LISTA_DESAFIOS);

  const pessoasPorId = {};
  pessoas.forEach(item => {
    const id = String(item.ID_DGMB || '').trim();
    if (id) pessoasPorId[id] = item;
  });

  const catalogo = mdg_catalogoDesafios_(lista);
  const periodosSet = new Set();
  Object.values(catalogo).forEach(desafio => {
    if (desafio.periodo) periodosSet.add(desafio.periodo);
  });

  const periodos = Array.from(periodosSet).sort((a, b) => chavePeriodo_(b) - chavePeriodo_(a));
  const periodoSelecionado = String(periodoSolicitado || '').trim() || periodos[0] || '';
  const idDesafioSelecionado = String(idDesafioSolicitado || '').trim();

  const metasTodas = mdg_obterMetas_();
  const metasPeriodo = metasTodas[periodoSelecionado] || {};
  const metaGeral = Number(metasPeriodo.geral || META_MARKETING || 0);
  const metasDesafios = metasPeriodo.desafios || {};

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
      cidadeUf: pessoa ? String(pessoa['Cidade-UF'] || '').trim() : '',
      whatsapp: pessoa ? String(pessoa.whatsapp || '').trim() : '',
      tipo: String(item.TIPO || '').trim(),
      status: String(item.STATUS || '').trim(),
      inscricoes: 0,
      totalHistorico: 0,
      link: montarLinkDivulgacao_(ref)
    };
  });

  const desafiosResumo = {};
  Object.values(catalogo)
    .filter(desafio => desafio.periodo === periodoSelecionado)
    .forEach(desafio => {
      desafiosResumo[desafio.id] = {
        ...desafio,
        meta: Number(metasDesafios[desafio.id] || 0),
        inscricoes: 0,
        atribuidas: 0,
        direto: 0,
        percentual: 0
      };
    });

  let totalGeralPeriodo = 0;
  let totalPeriodo = 0;
  let totalAtribuidas = 0;
  let totalDireto = 0;
  const totaisPorTipo = {};
  const totaisPorCidade = {};
  const totaisPorUf = {};

  inscricoes.forEach(inscricao => {
    const status = String(
      inscricao.Status_Usuario_Desafio || inscricao.Status_Desafio || ''
    ).toUpperCase();
    if (status.includes('CANCEL')) return;

    const ref = String(inscricao.REF_MARKETING || '').trim();
    if (ref && origens[ref]) origens[ref].totalHistorico++;

    const idDesafio = extrairIdDesafio_(inscricao.Observacao);
    const catalogado = catalogo[idDesafio];
    const periodo = catalogado ? catalogado.periodo : '';
    if (periodo !== periodoSelecionado) return;

    totalGeralPeriodo++;

    if (!desafiosResumo[idDesafio]) {
      desafiosResumo[idDesafio] = {
        id: idDesafio,
        codigo: idDesafio,
        nome: 'Desafio ' + idDesafio,
        periodo,
        tipo: 'NORMAL',
        meta: Number(metasDesafios[idDesafio] || 0),
        inscricoes: 0,
        atribuidas: 0,
        direto: 0,
        percentual: 0
      };
    }

    const resumoDesafio = desafiosResumo[idDesafio];
    resumoDesafio.inscricoes++;
    if (ref) resumoDesafio.atribuidas++;
    else resumoDesafio.direto++;

    if (idDesafioSelecionado && idDesafio !== idDesafioSelecionado) return;

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
    const partes = cidadeUf.split(' - ');
    const ufExtraida = partes.length > 1
      ? String(partes[partes.length - 1] || '').trim().toUpperCase()
      : '';
    const uf = /^[A-Z]{2}$/.test(ufExtraida) ? ufExtraida : 'NÃO INFORMADO';

    totaisPorCidade[cidade] = (totaisPorCidade[cidade] || 0) + 1;
    totaisPorUf[uf] = (totaisPorUf[uf] || 0) + 1;

    if (!ref) {
      totalDireto++;
      return;
    }

    totalAtribuidas++;
    if (origens[ref]) origens[ref].inscricoes++;
  });

  const listaDesafios = Object.values(desafiosResumo)
    .map(item => ({
      ...item,
      percentual: item.meta > 0
        ? Math.min(100, (item.inscricoes / item.meta) * 100)
        : 0
    }))
    .sort((a, b) => {
      if (b.inscricoes !== a.inscricoes) return b.inscricoes - a.inscricoes;
      return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
    });

  const desafioSelecionado = idDesafioSelecionado
    ? listaDesafios.find(item => String(item.id) === idDesafioSelecionado) || null
    : null;

  const meta = desafioSelecionado ? Number(desafioSelecionado.meta || 0) : metaGeral;
  const percentualMeta = meta > 0 ? Math.min(100, (totalPeriodo / meta) * 100) : 0;

  const divulgadores = Object.values(origens).sort((a, b) => {
    if (b.inscricoes !== a.inscricoes) return b.inscricoes - a.inscricoes;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  const principaisOrigens = divulgadores.filter(item => item.inscricoes > 0).slice(0, 6);

  const ordenarMetricas = totais => Object.keys(totais)
    .map(nome => ({ nome, inscricoes: totais[nome] }))
    .sort((a, b) => {
      if (b.inscricoes !== a.inscricoes) return b.inscricoes - a.inscricoes;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

  return {
    periodoSelecionado,
    periodos,
    idDesafioSelecionado,
    desafioSelecionado,
    desafios: listaDesafios,
    meta,
    metaGeral,
    metasDesafios,
    totalPeriodo,
    totalGeralPeriodo,
    totalAtribuidas,
    totalDireto,
    percentualMeta,
    divulgadores,
    principaisOrigens,
    metricasPorTipo: ordenarMetricas(totaisPorTipo),
    metricasPorCidade: ordenarMetricas(totaisPorCidade),
    metricasPorUf: ordenarMetricas(totaisPorUf)
  };
}
