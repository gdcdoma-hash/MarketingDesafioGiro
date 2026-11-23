'use strict';

// Testes isolados: não usa Apps Script, não acessa planilhas reais.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function criarAba(cabecalhos, linhas) {
  return {
    getDataRange() {
      return { getDisplayValues() { return [cabecalhos].concat(linhas); } };
    }
  };
}
function criarPlanilha(abas) {
  return { getSheetByName(nome) { return abas[nome] || null; } };
}

const planilhaPortal = criarPlanilha({
  DadosPessoais: criarAba(
    ['ID_DGMB', 'nome', 'Cidade-UF', 'whatsapp'],
    [
      ['100', 'Pessoa A', 'Cidade Alfa - MA', ''],
      ['101', 'Pessoa B', 'Cidade Beta - PA', ''],
      ['102', 'Pessoa C', 'Cidade Alfa - MA', '']
    ]
  ),
  dgmbDesafios: criarAba(
    ['ID_DGMB', 'Observacao', 'Status_Usuario_Desafio',
      'Status_Desafio', 'REF_MARKETING', 'periodo_desafio'],
    [
      ['100', '[ID_DESAFIO:166]', 'EM_ANDAMENTO', '', '200', 'novembro/2026'],
      ['101', '[ID_DESAFIO:166]', 'EM_ANDAMENTO', '', 'NAO_CADASTRADA', 'novembro/2026'],
      ['102', '[ID_DESAFIO:166]', 'CONCLUIDO', '', '', 'novembro/2026'],
      ['100', '[ID_DESAFIO:167]', 'CONCLUIDO', '', '200', 'novembro/2026'],
      ['100', '[ID_DESAFIO:166]', 'CANCELADO', '', '200', 'novembro/2026'],
      ['100', '[ID_DESAFIO:166]', 'EM_ANDAMENTO', 'DESISTENTE', '200', 'novembro/2026'],
      ['100', '[ID_DESAFIO:166]', 'EXPIRADO', '', '200', 'novembro/2026']
    ]
  ),
  ListaDesafios: criarAba(
    ['id_Desafio_lista', 'Periodo', 'Nome_Desafio', 'Tipo'],
    [
      ['166', 'novembro/2026', 'Selim', 'Normal'],
      ['167', 'novembro/2026', '50 km', 'Normal']
    ]
  )
});
const planilhaMarketing = criarPlanilha({
  Marketing: criarAba(
    ['REF', 'ID_DGMB', 'NOME_ORIGEM', 'TIPO', 'STATUS'],
    [['200', '100', '', 'PARTICIPANTE', 'ATIVO']]
  )
});

const sourceCode = fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8');
const sourcePlanilhas = fs.readFileSync(path.join(__dirname, '..', 'Planilhas.js'), 'utf8');
const context = vm.createContext({
  dg_abrirPlanilhaPortal_: () => planilhaPortal,
  dg_abrirPlanilhaMarketingRelacionamento_: () => planilhaMarketing,
  dg_configPlanilhas_: () => ({ ambiente: 'PROD' })
});
vm.runInContext(sourceCode, context, { filename: 'Code.js' });

const selim = context.obterDadosPainel('novembro/2026', '166');
assert.equal(selim.totalPeriodo, 3, 'Selim deve excluir cancelados, desistentes e expirados');
assert.equal(selim.totalAtribuidas, 1, 'Conta REF reconhecida');
assert.equal(selim.totalRefNaoCadastradas, 1, 'Destaca REF sem cadastro no Marketing');
assert.equal(selim.totalDireto, 1, 'Conta inscrições sem REF');
assert.equal(selim.idDesafioSelecionado, '166');
assert.equal(selim.nomeDesafioSelecionado, 'Selim');
assert.equal(selim.metricasPorCidade.find(c => c.nome === 'Cidade Alfa - MA').inscricoes, 2);

const outro = context.obterDadosPainel('novembro/2026', '167');
assert.equal(outro.totalPeriodo, 1, 'Outro desafio não deve misturar inscrições do Selim');
const todos = context.obterDadosPainel('novembro/2026', '');
assert.equal(todos.totalPeriodo, 4, 'Total do mês soma desafios válidos');
assert.equal(todos.catalogoDesafios.length, 2, 'Retorna catálogo de desafios para o filtro');
assert.equal(context.contarInscricoesMarketing_('200', 'novembro/2026', planilhaPortal, '166'), 1);

const contextoConfiguracao = vm.createContext({
  PropertiesService: {
    getScriptProperties() {
      return { getProperty(chave) {
        assert.ok(['DG_AMBIENTE','DG_PORTAL_SPREADSHEET_ID'].includes(chave));
        return chave === 'DG_AMBIENTE' ? 'PROD' : '';
      } };
    }
  },
  SpreadsheetApp: { openById(id) { return id; } }
});
vm.runInContext(sourceCode + '\n' + sourcePlanilhas, contextoConfiguracao);
assert.equal(
  contextoConfiguracao.dg_abrirPlanilhaPortal_(),
  '1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ',
  'Usa fonte atual como padrão quando propriedade não está definida'
);

console.log('Marketing/Relacionamento: 12 verificações isoladas aprovadas.');

{
  function contextoLab(props) {
    const ctx = vm.createContext({
      PropertiesService: {
        getScriptProperties() { return { getProperty(chave) { return props[chave] || ''; } }; }
      },
      SpreadsheetApp: { openById(id) { return id; } }
    });
    vm.runInContext(sourceCode + '\n' + sourcePlanilhas, ctx);
    return ctx;
  }
  const lab = contextoLab({
    DG_AMBIENTE: 'LAB',
    DG_PORTAL_SPREADSHEET_ID: '1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY',
    DG_MARKETING_SPREADSHEET_ID: '1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y'
  });
  assert.equal(lab.dg_abrirPlanilhaPortal_(), '1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY');
  assert.equal(lab.dg_abrirPlanilhaMarketingRelacionamento_(), '1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y');
  assert.throws(() => contextoLab({ DG_AMBIENTE: 'LAB' }).dg_abrirPlanilhaPortal_(), /LAB sem/);
  assert.throws(() => contextoLab({
    DG_AMBIENTE: 'LAB',
    DG_PORTAL_SPREADSHEET_ID: '1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ',
    DG_MARKETING_SPREADSHEET_ID: 'MARKETING_LAB_FICTICIO'
  }).dg_abrirPlanilhaPortal_(), /LAB não pode/);
  assert.throws(() => contextoLab({
    DG_AMBIENTE: 'LAB',
    DG_PORTAL_SPREADSHEET_ID: 'PORTAL_LAB_FICTICIO',
    DG_MARKETING_SPREADSHEET_ID: '1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao'
  }).dg_abrirPlanilhaMarketingRelacionamento_(), /LAB não pode/);
  assert.throws(() => contextoLab({
    DG_AMBIENTE: 'LAB',
    DG_PORTAL_SPREADSHEET_ID: 'BASE_UNICA',
    DG_MARKETING_SPREADSHEET_ID: 'BASE_UNICA'
  }).dg_abrirPlanilhaPortal_(), /LAB não pode/);
  assert.throws(() => contextoLab({}).dg_abrirPlanilhaPortal_(), /Defina DG_AMBIENTE/);
  assert.throws(() => contextoLab({
    DG_AMBIENTE: 'LAB',
    DG_PORTAL_SPREADSHEET_ID: 'PORTAL_LAB_FICTICIO',
    DG_MARKETING_SPREADSHEET_ID: 'MARKETING_LAB_FICTICIO'
  }).dg_abrirPlanilhaPortal_(), /somente as duas planilhas fictícias autorizadas/);
  assert.equal(lab.dg_configPlanilhas_().ambiente, 'LAB');
  assert.equal(context.dg_configPlanilhas_().ambiente, 'PROD');
  assert.equal(context.montarLinkDivulgacao_('LAB_TRANSMISSAO'), 'https://desafiogiro.gmbd.com.br/?ref=LAB_TRANSMISSAO');
  const testeLinkSemPonteReal = vm.createContext({
    dg_configPlanilhas_: () => ({ ambiente: 'LAB' })
  });
  vm.runInContext(sourceCode, testeLinkSemPonteReal);
  assert.equal(testeLinkSemPonteReal.montarLinkDivulgacao_('LAB_TRANSMISSAO'), '',
    'No LAB nenhum link deve apontar para o Portal de produção');
    assert.throws(() => contextoLab({ DG_AMBIENTE: 'DEV' }).dg_abrirPlanilhaPortal_(), /inválido/);
}
