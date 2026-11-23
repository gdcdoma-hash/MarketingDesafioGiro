/**
 * Teste operacional somente leitura para o projeto Apps Script LAB isolado.
 * Não retorna nomes, telefones nem outras informações de pessoas.
 * Executar no editor do projeto LAB após configurar as Script Properties.
 */
function dg_lab_autoteste() {
  const config = dg_configPlanilhas_();
  if (config.ambiente !== 'LAB') {
    throw new Error('Autoteste permitido exclusivamente em DG_AMBIENTE=LAB.');
  }

  const marketing = dg_abrirPlanilhaMarketingRelacionamento_();
  const portal = dg_abrirPlanilhaPortal_();
  const refs = lerAbaComoObjetos_(marketing, 'Marketing');
  const contatos = lerAbaComoObjetos_(marketing, 'Relacionamento_Contatos');
  const pessoas = lerAbaComoObjetos_(portal, 'DadosPessoais');
  const inscricoes = lerAbaComoObjetos_(portal, 'dgmbDesafios');
  const desafios = lerAbaComoObjetos_(portal, 'ListaDesafios');

  const verificacoes = [];
  const conferir = (chave, ok) => {
    verificacoes.push({ teste: chave, ok: ok === true });
  };
  conferir('Ambiente isolado', config.ambiente === 'LAB' &&
    config.marketingId === DG_LAB_MARKETING_SPREADSHEET_ID &&
    config.portalId === DG_LAB_PORTAL_SPREADSHEET_ID);
  conferir('Bases separadas', marketing.getId() !== portal.getId());
  conferir('Apenas contatos fictícios', contatos.length === 4 &&
    contatos.every(item => /^LAB0[1-4]$/.test(String(item.ID_DGMB || '')) &&
      /^Pessoa Teste /.test(String(item.NOME_PORTAL || ''))));
  conferir('Apenas participantes fictícios', pessoas.length === 4 &&
    pessoas.every(item => /^LAB0[1-4]$/.test(String(item.ID_DGMB || ''))));
  conferir('Duas REF fictícias', refs.length === 2 &&
    refs.some(item => item.REF === 'LAB_TRANSMISSAO' && item.STATUS === 'ATIVO') &&
    refs.some(item => item.REF === 'LAB_CORACAO' && item.STATUS === 'ATIVO'));
  conferir('Dois desafios LAB', desafios.length === 2 &&
    desafios.some(item => item.id_Desafio_lista === '9001') &&
    desafios.some(item => item.id_Desafio_lista === '9002'));
  conferir('Inscrições fictícias atribuídas', inscricoes.length === 4 &&
    inscricoes.every(item => /^LAB0[1-3]$/.test(String(item.ID_DGMB || '')) &&
      /^LAB_(TRANSMISSAO|CORACAO)$/.test(String(item.REF_MARKETING || ''))));
  conferir('Nenhum link público no LAB',
    montarLinkDivulgacao_('LAB_TRANSMISSAO') === '' &&
    montarLinkDivulgacao_('LAB_CORACAO') === '');

  const indice = rel_esporte_carregarIndicesPortal_();
  const classificar = numero => rel_esporte_classificarContato_({
    telefoneNormalizado: numero, modalidade: 'NAO_INFORMADO', eCiclista: 'NAO_CONFIRMADO'
  }, indice).perfilEsportivo;
  conferir('Modalidade somente ciclismo', classificar('5598991234501') === 'CICLISMO');
  conferir('Modalidade somente corrida/caminhada',
    classificar('5598991234502') === 'CAMINHADA_CORRIDA');
  conferir('Modalidade dupla', classificar('5598991234503') === 'AMBOS');

  const transmissao = obterDadosPainel('novembro/2026', '9001');
  const coracao = obterDadosPainel('novembro/2026', '9002');
  conferir('Atribuição Transmissão', transmissao.idDesafioSelecionado === '9001' &&
    transmissao.totalPeriodo === 2 &&
    transmissao.totalAtribuidas === 2 && transmissao.totalDireto === 0);
  conferir('Atribuição Coração', coracao.idDesafioSelecionado === '9002' &&
    coracao.totalPeriodo === 2 &&
    coracao.totalAtribuidas === 2 && coracao.totalDireto === 0);

  const passou = verificacoes.every(teste => teste.ok);
  return {
    status: passou ? 'OK' : 'FALHA',
    ambiente: 'LAB',
    verificacoes: verificacoes,
    resumo: {
      referencias: refs.length,
      contatos: contatos.length,
      pessoas: pessoas.length,
      inscricoes: inscricoes.length,
      desafios: desafios.length
    }
  };
}
