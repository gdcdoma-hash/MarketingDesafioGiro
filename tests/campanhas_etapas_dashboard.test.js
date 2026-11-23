'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Simulação estritamente fictícia de duas etapas de ciclismo e uma de corrida.
// Os IDs 9001, 9002 e 9003 NÃO identificam desafios reais.
const aba = (colunas, linhas) => ({
  getDataRange() { return { getDisplayValues() { return [colunas, ...linhas]; } }; }
});
const planilha = abas => ({ getSheetByName(nome) { return abas[nome] || null; } });
const marketing = planilha({
  Marketing: aba(['REF', 'ID_DGMB', 'NOME_ORIGEM', 'TIPO', 'STATUS'], [
    ['LAB_TRANSMISSAO', '', 'Equipe fictícia Bike', 'APOIADOR', 'ATIVO'],
    ['LAB_CORACAO', '', 'Equipe fictícia Corrida', 'APOIADOR', 'ATIVO']
  ])
});
const portal = planilha({
  DadosPessoais: aba(['ID_DGMB', 'nome', 'Cidade-UF', 'whatsapp'], [
    ['LAB01', 'Pessoa Teste 1', 'Cidade LAB - MA', ''],
    ['LAB02', 'Pessoa Teste 2', 'Cidade LAB - MA', '']
  ]),
  ListaDesafios: aba(['id_Desafio_lista', 'Periodo', 'Nome_Desafio', 'Tipo'], [
    ['9001', 'novembro/2026', 'Transmissão — etapa 1 (fictícia)', 'Normal'],
    ['9002', 'novembro/2026', 'Transmissão — etapa 2 (fictícia)', 'Normal'],
    ['9003', 'novembro/2026', 'Coração — única etapa (fictícia)', 'Normal']
  ]),
  dgmbDesafios: aba([
    'ID_DGMB', 'Observacao', 'Status_Usuario_Desafio', 'Status_Desafio',
    'REF_MARKETING', 'periodo_desafio'
  ], [
    ['LAB01', '[ID_DESAFIO:9001]', 'EM_ANDAMENTO', 'Ativo', 'LAB_TRANSMISSAO', 'novembro/2026'],
    ['LAB02', '[ID_DESAFIO:9002]', 'EM_ANDAMENTO', 'Ativo', 'LAB_TRANSMISSAO', 'novembro/2026'],
    ['LAB01', '[ID_DESAFIO:9003]', 'CONCLUIDO', 'Ativo', 'LAB_CORACAO', 'novembro/2026'],
    ['LAB02', '[ID_DESAFIO:9003]', 'EM_ANDAMENTO', 'Ativo', '', 'novembro/2026'],
    ['LAB02', '[ID_DESAFIO:9002]', 'CANCELADO', 'Ativo', 'LAB_TRANSMISSAO', 'novembro/2026'],
    ['LAB02', '[ID_DESAFIO:9001]', 'EM_ANDAMENTO', 'DESISTENTE', 'LAB_TRANSMISSAO', 'novembro/2026']
  ])
});
const codigo = fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8');
const contexto = vm.createContext({
  dg_abrirPlanilhaMarketingRelacionamento_: () => marketing,
  dg_abrirPlanilhaPortal_: () => portal,
  dg_configPlanilhas_: () => ({ ambiente: 'PROD' })
});
vm.runInContext(codigo, contexto, { filename: 'Code.js' });
const run = id => contexto.obterDadosPainel('novembro/2026', id);
const transmissao1 = run('9001');
const transmissao2 = run('9002');
const coracao = run('9003');
const total = run('');

assert.equal(transmissao1.totalPeriodo, 1, '1ª etapa não inclui a 2ª');
assert.equal(transmissao1.totalAtribuidas, 1);
assert.equal(transmissao2.totalPeriodo, 1, '2ª etapa não inclui a 1ª');
assert.equal(transmissao2.totalAtribuidas, 1);
assert.equal(coracao.totalPeriodo, 2, 'Única etapa inclui um link direto e uma REF');
assert.equal(coracao.totalAtribuidas, 1);
assert.equal(coracao.totalDireto, 1);
assert.equal(total.totalPeriodo, 4, 'A soma dos desafios não duplica desistências/cancelamentos');
assert.equal(total.totalAtribuidas, 3);
assert.equal(total.totalDireto, 1);
assert.equal(contexto.contarInscricoesMarketing_('LAB_TRANSMISSAO', 'novembro/2026', portal, '9001'), 1);
assert.equal(contexto.contarInscricoesMarketing_('LAB_TRANSMISSAO', 'novembro/2026', portal, '9002'), 1);
assert.equal(contexto.contarInscricoesMarketing_('LAB_TRANSMISSAO', 'novembro/2026', portal, '9003'), 0);
assert.equal(contexto.contarInscricoesMarketing_('LAB_CORACAO', 'novembro/2026', portal, '9003'), 1);
const inexistente = run('9999');
assert.equal(inexistente.totalPeriodo, 0);
assert.equal(inexistente.filtroDesafioInvalido, true);
assert.equal(inexistente.totalAtribuidas, 0);
console.log('OK: Transmissão 2 etapas e Coração 1 etapa independentes, sem atribuições cruzadas.');
