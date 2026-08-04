function rel_analise_separarCidadeUf_(valor) {
  const cidadeUf = String(valor || '').trim();
  const separador = cidadeUf.lastIndexOf('-');
  if (separador < 1) return { valido: false, cidade: '', uf: '' };
  const cidade = cidadeUf.slice(0, separador).trim();
  const uf = cidadeUf.slice(separador + 1).trim().toUpperCase();
  if (!cidade || !/^[A-Z]{2}$/.test(uf)) return { valido: false, cidade: '', uf: '' };
  return { valido: true, cidade: cidade, uf: uf };
}

function rel_analise_valor_(valor) {
  return valor === null || valor === undefined ? '' : String(valor).trim();
}

function rel_analise_mesmoCadastro_(ocorrencias) {
  const primeira = ocorrencias[0];
  return ocorrencias.every(item =>
    item.id === primeira.id && item.nome === primeira.nome && item.cidadeUf === primeira.cidadeUf
  );
}

function rel_analise_executar_() {
  try {
    const bases = rel_analise_lerBases_();
    const mapaPortal = bases.portal.mapa;
    const indice = {};
    let telefonesInvalidosDadosPessoais = 0;

    bases.portal.linhas.forEach((linha, indiceLinha) => {
      const telefone = rel_telefone_normalizar_(linha[mapaPortal.Telefone]);
      if (!telefone.valido) {
        telefonesInvalidosDadosPessoais += 1;
        return;
      }
      const registro = {
        id: rel_analise_valor_(linha[mapaPortal.ID_DGMB]),
        nome: rel_analise_valor_(linha[mapaPortal.Nome]),
        cidadeUf: rel_analise_valor_(linha[mapaPortal['Cidade-UF']]),
        linha: indiceLinha + 2
      };
      (indice[telefone.telefoneNormalizado] || (indice[telefone.telefoneNormalizado] = [])).push(registro);
    });

    const mapa = bases.contatos.mapa;
    const campos = ['ID_DGMB', 'NOME_PORTAL', 'CIDADE_UF_PORTAL', 'CIDADE', 'UF'];
    const colunas = {};
    REL_ANALISE_CABECALHOS_CONTATOS.slice(1).forEach(campo => {
      colunas[campo] = bases.contatos.linhas.map(linha => [linha[mapa[campo]]]);
    });
    const resumo = {
      totalContatos: 0, analisados: 0, encontrados: 0, naoEncontrados: 0,
      conflitos: 0, duplicidadesEquivalentes: 0, cadastrosIncompletos: 0,
      contatosInvalidos: 0, telefonesInvalidosDadosPessoais: telefonesInvalidosDadosPessoais,
      cidadeNaoSeparada: 0, atualizados: 0
    };
    const agora = new Date();

    bases.contatos.linhas.forEach((linha, posicao) => {
      const original = linha[mapa.TELEFONE_NORMALIZADO];
      if (!String(original || '').trim()) return;
      resumo.totalContatos += 1;
      resumo.analisados += 1;
      const telefone = rel_telefone_normalizar_(original);
      let alterouOficial = false;
      if (!telefone.valido) {
        resumo.contatosInvalidos += 1;
      } else {
        const ocorrencias = indice[telefone.telefoneNormalizado] || [];
        if (!ocorrencias.length) {
          resumo.naoEncontrados += 1;
        } else if (ocorrencias.length > 1 && !rel_analise_mesmoCadastro_(ocorrencias)) {
          resumo.conflitos += 1;
          Logger.log('Conflito na análise de contatos: %s', JSON.stringify({
            telefone: telefone.telefoneNormalizado,
            cadastros: ocorrencias.map(item => ({
              linhaDadosPessoais: item.linha,
              ID_DGMB: item.id,
              Nome: item.nome
            }))
          }));
        } else {
          const cadastro = ocorrencias[0];
          resumo.encontrados += 1;
          if (ocorrencias.length > 1) resumo.duplicidadesEquivalentes += 1;
          if (!cadastro.id || !cadastro.nome || !cadastro.cidadeUf) resumo.cadastrosIncompletos += 1;
          const oficiais = { ID_DGMB: cadastro.id, NOME_PORTAL: cadastro.nome, CIDADE_UF_PORTAL: cadastro.cidadeUf };
          Object.keys(oficiais).forEach(campo => {
            if (!oficiais[campo]) return;
            if (rel_analise_valor_(colunas[campo][posicao][0]) !== oficiais[campo]) alterouOficial = true;
            colunas[campo][posicao][0] = oficiais[campo];
          });
          if (cadastro.cidadeUf) {
            const local = rel_analise_separarCidadeUf_(cadastro.cidadeUf);
            if (local.valido) {
              ['CIDADE', 'UF'].forEach(campo => {
                const valor = campo === 'CIDADE' ? local.cidade : local.uf;
                if (rel_analise_valor_(colunas[campo][posicao][0]) !== valor) alterouOficial = true;
                colunas[campo][posicao][0] = valor;
              });
            } else {
              resumo.cidadeNaoSeparada += 1;
            }
          }
        }
      }
      colunas.DATA_ANALISE[posicao][0] = agora;
      colunas.ATUALIZADO_EM[posicao][0] = agora;
      if (alterouOficial) resumo.atualizados += 1;
    });

    rel_analise_gravarContatos_(bases.contatos, colunas);
    return { status: 'OK', mensagem: 'Análise concluída com sucesso.', dados: resumo };
  } catch (erro) {
    console.error(erro);
    const estruturaInvalida = erro && /^ESTRUTURA_/.test(erro.message || '');
    return {
      status: estruturaInvalida ? 'ERRO_ESTRUTURA' : 'ERRO_ANALISE',
      mensagem: estruturaInvalida
        ? (erro.message === 'ESTRUTURA_DADOS_PESSOAIS_INVALIDA'
          ? 'A aba DadosPessoais não possui todos os cabeçalhos necessários para a análise.'
          : 'Não foi possível analisar os contatos porque a estrutura das planilhas está incompleta.')
        : 'Não foi possível concluir a análise dos contatos.',
      dados: {}
    };
  }
}
