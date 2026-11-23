'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'Code.js'), 'utf8');
const service = fs.readFileSync(path.join(root, 'RelContatosService.js'), 'utf8');
function sheet(headers, rows) {
  return { getDataRange() { return { getDisplayValues() { return [headers, ...rows]; } }; } };
}
const marketingRows = [
  ['constructor', '', 'Canal Constructor', 'APOIADOR', 'ATIVO'],
  ['__proto__', '', 'Canal Proto', 'GRUPO', 'ATIVO'],
  ['constructor', '', 'Canal Duplicado', 'APOIADOR', 'ATIVO'],
  ['toString', '', 'Canal Inativo', 'GRUPO', 'INATIVO']
];
const marketing = {
  getSheetByName(name) {
    return name === 'Marketing'
      ? sheet(['REF', 'ID_DGMB', 'NOME_ORIGEM', 'TIPO', 'STATUS'], marketingRows)
      : null;
  }
};
const portal = {
  getSheetByName(name) {
    if (name === 'DadosPessoais') return sheet(
      ['ID_DGMB','nome','Cidade-UF','whatsapp'],
      [['101','Pessoa Teste 1','Cidade LAB - MA',''], ['102','Pessoa Teste 2','Cidade LAB - MA','']]);
    if (name === 'ListaDesafios') return sheet(
      ['id_Desafio_lista','Periodo','Nome_Desafio','Tipo'],
      [['9001','novembro/2026','Transmissão LAB','Normal']]);
    if (name === 'dgmbDesafios') return sheet(
      ['ID_DGMB','Observacao','Status_Usuario_Desafio','Status_Desafio','REF_MARKETING','periodo_desafio'],
      [
        ['101','[ID_DESAFIO:9001]','EM_ANDAMENTO','Ativo','constructor','novembro/2026'],
        ['102','[ID_DESAFIO:9001]','EM_ANDAMENTO','Ativo','__proto__','novembro/2026']
      ]);
    return null;
  }
};
const ctx = vm.createContext({
  dg_configPlanilhas_: () => ({ ambiente: 'PROD' }),
  dg_abrirPlanilhaMarketingRelacionamento_: () => marketing,
  dg_abrirPlanilhaPortal_: () => portal,
  lerAbaComoObjetos_: undefined
});
vm.runInContext(code, ctx, {filename:'Code.js'});
vm.runInContext(service, ctx, {filename:'RelContatosService.js'});

const painel = ctx.obterDadosPainel('novembro/2026','9001');
assert.equal(painel.totalPeriodo,2);
assert.equal(painel.totalAtribuidas,2,'REF reservadas não são confundidas com protótipo');
assert.equal(painel.totalRefNaoCadastradas,0);
assert.equal(painel.divulgadores.find(x=>x.ref==='constructor').inscricoes,1);
assert.equal(painel.divulgadores.find(x=>x.ref==='__proto__').inscricoes,1);
const opcoes = ctx.rel_contatos_referenciasMarketing_();
assert.equal(opcoes.length,2,'REF ativas distintas preservadas, inclusive __proto__');
assert.ok(opcoes.some(x=>x.ref==='constructor'));
assert.ok(opcoes.some(x=>x.ref==='__proto__'));
assert.ok(!opcoes.some(x=>x.ref==='toString'));
console.log('OK: REF com nomes reservados não corrompe métricas ou opções de contato.');
