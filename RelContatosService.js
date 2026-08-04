function rel_contatos_resposta_(status, mensagem, dados) {
  return { status: status, mensagem: mensagem || '', dados: dados || {} };
}

function rel_contatos_texto_(valor) {
  return String(valor || '').trim();
}

function rel_contatos_normalizar_(valor) {
  return rel_contatos_texto_(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function rel_contatos_normalizarRegiao_(valor) {
  return rel_contatos_normalizar_(valor).replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function rel_contatos_dataIso_(valor) {
  if (!valor) return '';
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? rel_contatos_texto_(valor) : data.toISOString();
}

function rel_contatos_listar_(filtros) {
  const entrada = filtros || {};
  const pagina = Math.max(1, Number(entrada.pagina) || 1);
  const porPagina = Math.min(100, Math.max(1, Number(entrada.porPagina) || 50));
  const classificacao = rel_contatos_texto_(entrada.classificacao || 'TODOS').toUpperCase();
  const etapa = rel_contatos_texto_(entrada.etapa || 'PADRAO').toUpperCase();
  const idOrigem = rel_contatos_texto_(entrada.idOrigem);
  const busca = rel_contatos_normalizar_(entrada.busca);
  if (['TODOS', 'IDENTIFICADO_PORTAL', 'CONTATO_NOVO'].indexOf(classificacao) < 0) {
    return rel_contatos_resposta_('ERRO_VALIDACAO', 'Classificação inválida.');
  }
  if (etapa !== 'TODOS' && etapa !== 'PADRAO' && REL_CONFIG.ENUMS.ETAPA.indexOf(etapa) < 0) {
    return rel_contatos_resposta_('ERRO_VALIDACAO', 'Etapa inválida.');
  }

  const base = rel_contatos_carregarListagem_();
  const mc = base.contatos.mapa;
  const mo = base.origens.mapa;
  const mv = base.vinculos.mapa;
  const mci = base.cidades.mapa;
  const origensPorId = {};
  const opcoesOrigem = [];
  base.origens.valores.forEach(linha => {
    const id = rel_contatos_texto_(linha[mo.ID_ORIGEM]);
    const nome = rel_contatos_texto_(linha[mo.NOME_ORIGEM]);
    const status = rel_contatos_texto_(linha[mo.STATUS]);
    if (id) origensPorId[id] = nome;
    if (id && status === 'ATIVO') opcoesOrigem.push({ idOrigem: id, nomeOrigem: nome });
  });
  opcoesOrigem.sort((a, b) => a.nomeOrigem.localeCompare(b.nomeOrigem, 'pt-BR'));
  const vinculosPorTelefone = {};
  base.vinculos.valores.forEach(linha => {
    const telefone = rel_contatos_texto_(linha[mv.TELEFONE_NORMALIZADO]);
    const origem = rel_contatos_texto_(linha[mv.ID_ORIGEM]);
    if (!telefone || !origem) return;
    if (!vinculosPorTelefone[telefone]) vinculosPorTelefone[telefone] = [];
    if (vinculosPorTelefone[telefone].indexOf(origem) < 0) vinculosPorTelefone[telefone].push(origem);
  });
  const regioesPorCidade = {};
  base.cidades.valores.forEach(linha => {
    if (rel_contatos_texto_(linha[mci.STATUS]) !== 'ATIVO') return;
    const uf = rel_contatos_texto_(linha[mci.UF]).toUpperCase();
    const cidadeNormalizada = rel_contatos_texto_(linha[mci.CIDADE_NORMALIZADA]) ||
      rel_contatos_normalizar_(linha[mci.CIDADE]);
    if (uf && cidadeNormalizada) {
      regioesPorCidade[uf + '|' + cidadeNormalizada] = rel_contatos_normalizarRegiao_(linha[mci.REGIAO]);
    }
  });

  const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
  const contatos = base.contatos.valores.map((linha, indice) => {
    const valor = nome => mc[nome] === undefined ? '' : linha[mc[nome]];
    const telefoneNormalizado = rel_contatos_texto_(valor('TELEFONE_NORMALIZADO'));
    const idDgmb = rel_contatos_texto_(valor('ID_DGMB'));
    const nomePortal = rel_contatos_texto_(valor('NOME_PORTAL'));
    const nomeContato = rel_contatos_texto_(valor('NOME_CONTATO'));
    const cidadePortal = rel_contatos_texto_(valor('CIDADE_UF_PORTAL'));
    const cidade = rel_contatos_texto_(valor('CIDADE'));
    const uf = rel_contatos_texto_(valor('UF')).toUpperCase();
    const idsOrigens = vinculosPorTelefone[telefoneNormalizado] || [];
    const proximo = rel_contatos_dataIso_(valor('DATA_PROXIMO_RETORNO'));
    return {
      telefoneNormalizado: telefoneNormalizado,
      telefoneExibicao: rel_contatos_texto_(valor('TELEFONE_EXIBICAO')) || telefoneNormalizado,
      idDgmb: idDgmb,
      nomeExibicao: nomePortal || nomeContato || 'Nome não informado',
      nomePortal: nomePortal,
      nomeContato: nomeContato,
      cidadeUfExibicao: cidadePortal || (cidade && uf ? cidade + '-' + uf : cidade) || 'Cidade não informada',
      cidade: cidade,
      uf: uf,
      regiao: cidade && uf ? (regioesPorCidade[uf + '|' + rel_contatos_normalizar_(cidade)] || '') : '',
      classificacao: idDgmb ? 'IDENTIFICADO_PORTAL' : 'CONTATO_NOVO',
      etapa: rel_contatos_texto_(valor('ETAPA')) || 'PARA_CONTATAR',
      resultado: rel_contatos_texto_(valor('RESULTADO')),
      eCiclista: rel_contatos_texto_(valor('E_CICLISTA')) || 'NAO_CONFIRMADO',
      modalidade: rel_contatos_texto_(valor('MODALIDADE')) || 'NAO_INFORMADO',
      observacao: rel_contatos_texto_(valor('OBSERVACAO')),
      proximoRetorno: proximo,
      origens: idsOrigens.map(id => origensPorId[id]).filter((nome, posicao, lista) => nome && lista.indexOf(nome) === posicao),
      idsOrigens: idsOrigens,
      ordemAntiguidade: rel_contatos_dataIso_(valor('DATA_PRIMEIRA_IMPORTACAO')) || String(indice).padStart(8, '0')
    };
  }).filter(contato => {
    if (classificacao !== 'TODOS' && contato.classificacao !== classificacao) return false;
    if (etapa === 'PADRAO' && contato.etapa === 'FINALIZADO') return false;
    if (etapa !== 'PADRAO' && etapa !== 'TODOS' && contato.etapa !== etapa) return false;
    if (idOrigem && contato.idsOrigens.indexOf(idOrigem) < 0) return false;
    if (!busca) return true;
    return [contato.telefoneNormalizado, contato.telefoneExibicao, contato.idDgmb, contato.nomePortal,
      contato.nomeContato, contato.cidadeUfExibicao, contato.cidade, contato.uf]
      .some(valor => rel_contatos_normalizar_(valor).indexOf(busca) >= 0);
  });

  contatos.sort((a, b) => {
    const vencidoA = a.etapa === 'RETORNAR_DEPOIS' && a.proximoRetorno && new Date(a.proximoRetorno) <= hoje;
    const vencidoB = b.etapa === 'RETORNAR_DEPOIS' && b.proximoRetorno && new Date(b.proximoRetorno) <= hoje;
    const pesos = { PARA_CONTATAR: 1, AGUARDANDO_RESPOSTA: 2, EM_CONVERSA: 3, RETORNAR_DEPOIS: 4, FINALIZADO: 5 };
    const pesoA = vencidoA ? 0 : (pesos[a.etapa] || 4);
    const pesoB = vencidoB ? 0 : (pesos[b.etapa] || 4);
    return pesoA - pesoB || a.ordemAntiguidade.localeCompare(b.ordemAntiguidade);
  });
  const total = contatos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaValida = Math.min(pagina, totalPaginas);
  const inicio = (paginaValida - 1) * porPagina;
  return rel_contatos_resposta_('OK', '', {
    contatos: contatos.slice(inicio, inicio + porPagina).map(contato => { delete contato.idsOrigens; delete contato.ordemAntiguidade; return contato; }),
    pagina: paginaValida, porPagina: porPagina, total: total, totalPaginas: totalPaginas, origens: opcoesOrigem
  });
}

function rel_contatos_atualizarEtapa_(dados) {
  const entrada = dados || {};
  const telefone = rel_contatos_texto_(entrada.telefoneNormalizado);
  const etapa = rel_contatos_texto_(entrada.etapa).toUpperCase();
  const retorno = rel_contatos_texto_(entrada.proximoRetorno);
  if (!telefone || REL_CONFIG.ENUMS.ETAPA.indexOf(etapa) < 0) return rel_contatos_resposta_('ERRO_VALIDACAO', 'Contato ou etapa inválida.');
  if (etapa === 'RETORNAR_DEPOIS' && !retorno) return rel_contatos_resposta_('ERRO_VALIDACAO', 'Informe a data do próximo retorno.');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const registro = rel_contatos_localizar_(telefone);
    if (!registro) return rel_contatos_resposta_('NAO_ENCONTRADO', 'Contato não encontrado.');
    const retornoAtual = registro.mapa.DATA_PROXIMO_RETORNO === undefined ? '' : registro.valores[registro.mapa.DATA_PROXIMO_RETORNO];
    if (etapa === 'PARA_CONTATAR' && retornoAtual && entrada.limparProximoRetorno !== true) {
      return rel_contatos_resposta_('CONFIRMACAO_NECESSARIA', 'Confirme se deseja limpar a data do próximo retorno.');
    }
    const agora = new Date();
    const campos = { ETAPA: etapa, DATA_ULTIMA_INTERACAO: agora, ATUALIZADO_EM: agora };
    let proximoRetornoFinal = '';
    if (etapa === 'RETORNAR_DEPOIS') {
      campos.DATA_PROXIMO_RETORNO = new Date(retorno + 'T12:00:00');
      proximoRetornoFinal = rel_contatos_dataIso_(campos.DATA_PROXIMO_RETORNO);
    } else if (etapa === 'PARA_CONTATAR') {
      if (entrada.limparProximoRetorno === true) campos.DATA_PROXIMO_RETORNO = '';
      else proximoRetornoFinal = rel_contatos_dataIso_(retornoAtual);
    } else {
      campos.DATA_PROXIMO_RETORNO = '';
    }
    rel_contatos_atualizarCampos_(registro, campos);
    return rel_contatos_resposta_('OK', 'Etapa atualizada.', {
      etapa: etapa,
      proximoRetorno: proximoRetornoFinal
    });
  } finally { lock.releaseLock(); }
}

function rel_contatos_salvarDados_(dados) {
  const entrada = dados || {};
  const telefone = rel_contatos_texto_(entrada.telefoneNormalizado);
  const nome = rel_contatos_texto_(entrada.nomeContato).replace(/\s+/g, ' ');
  const uf = rel_contatos_texto_(entrada.uf).toUpperCase();
  const cidade = rel_contatos_texto_(entrada.cidade);
  const ciclista = rel_contatos_texto_(entrada.eCiclista).toUpperCase();
  const modalidade = rel_contatos_texto_(entrada.modalidade).toUpperCase();
  if (!telefone) return rel_contatos_resposta_('ERRO_VALIDACAO', 'Contato inválido.');
  if (ciclista && REL_CONFIG.ENUMS.E_CICLISTA.indexOf(ciclista) < 0) return rel_contatos_resposta_('ERRO_VALIDACAO', 'Opção de ciclista inválida.');
  if (modalidade && REL_CONFIG.ENUMS.MODALIDADE.indexOf(modalidade) < 0) return rel_contatos_resposta_('ERRO_VALIDACAO', 'Modalidade inválida.');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const registro = rel_contatos_localizar_(telefone);
    if (!registro) return rel_contatos_resposta_('NAO_ENCONTRADO', 'Contato não encontrado.');
    const campos = { ATUALIZADO_EM: new Date() };
    if (nome) campos.NOME_CONTATO = nome;
    if (cidade && uf) {
      campos.CIDADE = cidade;
      campos.UF = uf;
    }
    if (REL_CONFIG.ENUMS.E_CICLISTA.indexOf(ciclista) >= 0) campos.E_CICLISTA = ciclista;
    if (REL_CONFIG.ENUMS.MODALIDADE.indexOf(modalidade) >= 0) campos.MODALIDADE = modalidade;
    if (Object.prototype.hasOwnProperty.call(entrada, 'observacao') && rel_contatos_texto_(entrada.observacao)) {
      campos.OBSERVACAO = rel_contatos_texto_(entrada.observacao);
    }
    rel_contatos_atualizarCampos_(registro, campos);
    const atual = cabecalho => campos[cabecalho] !== undefined
      ? campos[cabecalho]
      : rel_contatos_texto_(registro.valores[registro.mapa[cabecalho]]);
    return rel_contatos_resposta_('OK', 'Dados do contato salvos.', {
      nomeContato: atual('NOME_CONTATO'),
      cidade: atual('CIDADE'),
      uf: atual('UF')
    });
  } finally { lock.releaseLock(); }
}

function rel_cidades_listarOpcoes_(filtros) {
  const entrada = filtros || {};
  const uf = rel_contatos_texto_(entrada.uf).toUpperCase();
  const regiao = rel_contatos_normalizarRegiao_(entrada.regiao);
  const dados = rel_cidades_ler_();
  const m = dados.mapa;
  const cidades = dados.valores.filter(linha => rel_contatos_texto_(linha[m.STATUS]) === 'ATIVO')
    .filter(linha => !uf || rel_contatos_texto_(linha[m.UF]).toUpperCase() === uf)
    .filter(linha => !regiao || rel_contatos_normalizarRegiao_(linha[m.REGIAO]) === regiao)
    .map(linha => ({ uf: rel_contatos_texto_(linha[m.UF]), regiao: rel_contatos_texto_(linha[m.REGIAO]), cidade: rel_contatos_texto_(linha[m.CIDADE]) }))
    .sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt-BR'));
  return rel_contatos_resposta_('OK', '', { cidades: cidades });
}

function rel_cidades_cadastrar_(dados) {
  const entrada = dados || {};
  const uf = rel_contatos_texto_(entrada.uf).toUpperCase();
  const regiao = rel_contatos_texto_(entrada.regiao).toUpperCase();
  const cidade = rel_contatos_texto_(entrada.cidade).replace(/\s+/g, ' ');
  if (!uf || !regiao || !cidade) return rel_contatos_resposta_('ERRO_VALIDACAO', 'Informe UF, região e cidade.');
  const normalizada = rel_contatos_normalizar_(cidade);
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const base = rel_cidades_ler_(); const m = base.mapa;
    const existe = base.valores.some(linha => rel_contatos_texto_(linha[m.UF]).toUpperCase() === uf && rel_contatos_texto_(linha[m.CIDADE_NORMALIZADA]) === normalizada);
    if (existe) return rel_contatos_resposta_('DUPLICADO', 'Esta cidade já está cadastrada.');
    rel_cidades_inserir_({ UF: uf, REGIAO: regiao, CIDADE: cidade, CIDADE_NORMALIZADA: normalizada, ORIGEM_CADASTRO: 'ATENDIMENTO', STATUS: 'ATIVO', DATA_CADASTRO: new Date() });
    return rel_contatos_resposta_('OK', 'Cidade cadastrada.', { cidade: { uf: uf, regiao: regiao, cidade: cidade } });
  } finally { lock.releaseLock(); }
}
