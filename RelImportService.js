function rel_importacao_resposta_(status, mensagem, dados) {
  return { status: status, mensagem: mensagem || '', dados: dados || {} };
}

function rel_importacao_validarSelecao_(dados) {
  const entrada = dados || {};
  const idOrigem = String(entrada.idOrigem || '').trim();
  if (!idOrigem) return { erro: 'Selecione uma origem.' };
  const nomeArquivo = String(entrada.nomeArquivo || '').trim();
  if (!nomeArquivo) return { erro: 'O nome do arquivo não foi informado.' };
  const nomeAbaArquivo = String(entrada.nomeAbaArquivo || '').trim();
  if (!nomeAbaArquivo) return { erro: 'O nome da aba do arquivo não foi informado.' };
  const origem = rel_origem_listarRegistros_()
    .find(item => item.idOrigem === idOrigem && item.status === 'ATIVO');
  if (!origem) return { erro: 'A origem selecionada não existe ou está inativa.' };
  return { origem: origem, nomeArquivo: nomeArquivo, nomeAbaArquivo: nomeAbaArquivo };
}

function rel_importacao_obterOpcoes_() {
  const origens = rel_origem_listarRegistros_()
    .filter(origem => origem.status === 'ATIVO')
    .map(origem => ({ idOrigem: origem.idOrigem, nomeOrigem: origem.nomeOrigem }));
  return rel_importacao_resposta_('OK', '', {
    origens: origens
  });
}

function rel_importacao_analisar_(dados) {
  const selecao = rel_importacao_validarSelecao_(dados);
  if (selecao.erro) {
    return { erro: rel_importacao_resposta_('ERRO_VALIDACAO', selecao.erro, {}) };
  }
  const valores = Array.isArray(dados && dados.registros) ? dados.registros : [];
  if (valores.length > 5000) {
    return { erro: rel_importacao_resposta_(
      'ERRO_VALIDACAO',
      'O limite por importação é de 5.000 registros. Divida o arquivo e tente novamente.',
      {}
    ) };
  }
  const porTelefone = {};
  let vazios = 0;
  let invalidos = 0;
  const amostraInvalidos = [];
  valores.forEach((registro, indice) => {
    const valor = registro && registro.telefoneOriginal;
    const linhaArquivo = Number(registro && registro.linhaArquivo) || indice + 2;
    if (!String(valor || '').trim()) { vazios++; return; }
    const normalizado = rel_telefone_normalizar_(valor);
    if (!normalizado.valido) {
      invalidos++;
      if (amostraInvalidos.length < 20) {
        amostraInvalidos.push({
          linha: linhaArquivo,
          valorOriginal: String(valor),
          motivo: normalizado.motivo
        });
      }
      return;
    }
    const telefone = normalizado.telefoneNormalizado;
    if (!porTelefone[telefone]) {
      porTelefone[telefone] = {
        telefone: telefone,
        telefoneExibicao: normalizado.telefoneExibicao,
        ocorrencias: 0
      };
    }
    porTelefone[telefone].ocorrencias++;
  });

  const contatosTabela = rel_importacao_obterTabela_(REL_CONFIG.ABAS.CONTATOS, [
    'TELEFONE_NORMALIZADO', 'TELEFONE_EXIBICAO', 'NOME_CONTATO', 'ETAPA', 'RESULTADO', 'VALIDADE',
    'E_CICLISTA', 'MODALIDADE', 'DATA_PRIMEIRA_IMPORTACAO', 'DATA_ULTIMA_IMPORTACAO',
    'QUANTIDADE_TENTATIVAS', 'EXPORTACAO_GOOGLE_STATUS', 'ATUALIZADO_EM'
  ]);
  const vinculosTabela = rel_importacao_obterTabela_(REL_CONFIG.ABAS.CONTATO_ORIGENS, [
    'TELEFONE_NORMALIZADO', 'ID_ORIGEM', 'DATA_PRIMEIRA_IDENTIFICACAO',
    'DATA_ULTIMA_IDENTIFICACAO', 'QUANTIDADE_OCORRENCIAS'
  ]);
  const contatos = rel_importacao_lerRegistros_(contatosTabela, [
    'TELEFONE_NORMALIZADO', 'TELEFONE_EXIBICAO', 'NOME_CONTATO'
  ]);
  const vinculos = rel_importacao_lerRegistros_(vinculosTabela, [
    'TELEFONE_NORMALIZADO', 'ID_ORIGEM', 'QUANTIDADE_OCORRENCIAS'
  ]);
  const contatosPorTelefone = {};
  contatos.forEach(item => { contatosPorTelefone[String(item.TELEFONE_NORMALIZADO)] = item; });
  const vinculosPorChave = {};
  vinculos.forEach(item => {
    vinculosPorChave[String(item.TELEFONE_NORMALIZADO) + '|' + String(item.ID_ORIGEM)] = item;
  });
  const telefones = Object.keys(porTelefone);
  const novos = telefones.filter(telefone => !contatosPorTelefone[telefone]);
  const existentes = telefones.filter(telefone => contatosPorTelefone[telefone]);
  const novosVinculos = telefones.filter(telefone =>
    !vinculosPorChave[telefone + '|' + selecao.origem.idOrigem]);
  return {
    selecao: selecao, porTelefone: porTelefone, contatosTabela: contatosTabela,
    vinculosTabela: vinculosTabela, contatosPorTelefone: contatosPorTelefone,
    vinculosPorChave: vinculosPorChave, amostraInvalidos: amostraInvalidos,
    resumo: {
      linhasLidas: valores.length,
      telefonesValidos: telefones.length,
      vazios: vazios,
      invalidos: invalidos,
      duplicadosNaFonte: telefones.reduce((total, telefone) => total + porTelefone[telefone].ocorrencias - 1, 0),
      contatosNovos: novos.length,
      contatosExistentes: existentes.length,
      vinculosNovos: novosVinculos.length,
      vinculosExistentes: telefones.length - novosVinculos.length
    }
  };
}

function rel_importacao_preAnalisar_(dados) {
  const analise = rel_importacao_analisar_(dados);
  if (analise.erro) return analise.erro;
  if (!analise.resumo.telefonesValidos) {
    return rel_importacao_resposta_('ERRO_VALIDACAO', 'Nenhum telefone válido foi encontrado no arquivo selecionado.', {
      resumo: analise.resumo,
      amostraInvalidos: analise.amostraInvalidos
    });
  }
  return rel_importacao_resposta_('OK', 'Pré-análise concluída.', {
    origem: { idOrigem: analise.selecao.origem.idOrigem, nomeOrigem: analise.selecao.origem.nomeOrigem },
    resumo: analise.resumo,
    amostraInvalidos: analise.amostraInvalidos
  });
}

function rel_importacao_confirmar_(dados) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const analise = rel_importacao_analisar_(dados);
    if (analise.erro) return analise.erro;
    if (!analise.resumo.telefonesValidos) {
      return rel_importacao_resposta_('ERRO_VALIDACAO', 'Nenhum telefone válido foi encontrado no arquivo selecionado.', {
        resumo: analise.resumo,
        amostraInvalidos: analise.amostraInvalidos
      });
    }
    const agora = new Date();
    const telefones = Object.keys(analise.porTelefone);
    const novosContatos = [];
    const contatosExistentes = [];
    const novosVinculos = [];
    const vinculosExistentes = [];
    telefones.forEach(telefone => {
      const item = analise.porTelefone[telefone];
      const contato = analise.contatosPorTelefone[telefone];
      if (contato) {
        contato.telefoneExibicao = item.telefoneExibicao;
        contatosExistentes.push(contato);
      }
      else novosContatos.push({
        TELEFONE_NORMALIZADO: telefone,
        TELEFONE_EXIBICAO: item.telefoneExibicao,
        ID_DGMB: '', NOME_PORTAL: '', NOME_CONTATO: '', CIDADE_UF_PORTAL: '',
        CIDADE: '', UF: '',
        ETAPA: 'PARA_CONTATAR', RESULTADO: 'NAO_DEFINIDO', VALIDADE: 'VALIDO',
        E_CICLISTA: 'NAO_CONFIRMADO', MODALIDADE: 'NAO_INFORMADO',
        DATA_PRIMEIRA_IMPORTACAO: agora, DATA_ULTIMA_IMPORTACAO: agora,
        QUANTIDADE_TENTATIVAS: 0, EXPORTACAO_GOOGLE_STATUS: 'NAO_PREPARADO',
        ATUALIZADO_EM: agora
      });
      const chave = telefone + '|' + analise.selecao.origem.idOrigem;
      const vinculo = analise.vinculosPorChave[chave];
      if (vinculo) {
        vinculosExistentes.push(vinculo);
      } else novosVinculos.push({
        TELEFONE_NORMALIZADO: telefone,
        ID_ORIGEM: analise.selecao.origem.idOrigem,
        DATA_PRIMEIRA_IDENTIFICACAO: agora,
        DATA_ULTIMA_IDENTIFICACAO: agora,
        QUANTIDADE_OCORRENCIAS: 1
      });
    });
    rel_importacao_inserirLinhas_(analise.contatosTabela, novosContatos);
    rel_importacao_atualizarContatos_(analise.contatosTabela, contatosExistentes, agora);
    rel_importacao_inserirLinhas_(analise.vinculosTabela, novosVinculos);
    rel_importacao_atualizarVinculos_(analise.vinculosTabela, vinculosExistentes, agora);
    return rel_importacao_resposta_('OK', 'Importação concluída com sucesso.', {
      resumo: Object.assign({}, analise.resumo, {
        contatosCriados: novosContatos.length,
        contatosAtualizados: contatosExistentes.length,
        vinculosCriados: novosVinculos.length,
        vinculosAtualizados: vinculosExistentes.length
      }),
      amostraInvalidos: analise.amostraInvalidos
    });
  } finally {
    lock.releaseLock();
  }
}
