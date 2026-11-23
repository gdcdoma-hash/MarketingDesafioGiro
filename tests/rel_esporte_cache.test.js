'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const fonte = fs.readFileSync(path.join(__dirname, '..', 'RelEsporteService.js'), 'utf8');
const dados = {
  DadosPessoais: [{ID_DGMB:'LAB01',whatsapp:'5598991234501',nome:'NOME_NAO_PODE_ENTRAR_CACHE'}],
  dgmbDesafios: [{ID_DGMB:'LAB01',Observacao:'[ID_DESAFIO:9001]',Modalidade_Esportiva:'CICLISMO'}],
  ListaDesafios: [{id_Desafio_lista:'9001',Nome_Desafio:'Desafio fictício'}]
};
let leituras = 0, gravacoes = 0, ultimaGravacao;
let valorCache = '';
const cache = {
  get() { return valorCache; },
  put(chave, valor, ttl) {
    assert.match(chave, /^DG_REL_ESPORTE_/);
    assert.equal(ttl, 120);
    gravacoes++;
    ultimaGravacao = valor;
    valorCache = valor;
  }
};
function contexto(cacheService = {getScriptCache: () => cache}) {
  const ctx = vm.createContext({
    CacheService: cacheService,
    dg_abrirPlanilhaPortal_: () => ({}),
    lerAbaComoObjetos_: (_, nome) => { leituras++; return dados[nome]; },
    rel_telefone_normalizar_: numero => ({
      valido: Boolean(numero), telefoneNormalizado: String(numero)
    }),
    extrairIdDesafio_: texto => (String(texto).match(/\[ID_DESAFIO:(\d+)\]/) || [])[1] || ''
  });
  vm.runInContext(fonte,ctx);
  return ctx;
}
const ctx = contexto();
const um = ctx.rel_esporte_carregarIndicesPortal_();
assert.equal(um['5598991234501'].ciclismo, true);
assert.equal(leituras, 3, 'Primeira leitura precisa consultar três abas');
assert.equal(gravacoes, 1);
assert.doesNotMatch(ultimaGravacao,/NOME_NAO_PODE_ENTRAR_CACHE/);
assert.doesNotMatch(ultimaGravacao,/LAB01/);

const dois = ctx.rel_esporte_carregarIndicesPortal_();
assert.equal(dois['5598991234501'].ciclismo, true);
assert.equal(leituras,3,'Filtro seguinte reutiliza cache sem reler três abas');
assert.equal(gravacoes,1);

const force = ctx.rel_esporte_carregarIndicesPortal_(true);
assert.equal(force['5598991234501'].ciclismo,true);
assert.equal(leituras,6,'Leitura forçada ignora cache, útil para auditoria LAB');
assert.equal(gravacoes,2);

valorCache = '{quebrado';
ctx.rel_esporte_carregarIndicesPortal_();
assert.equal(leituras,9,'Cache inválido não impede operação');

const semCache = contexto({getScriptCache(){throw new Error('cache indisponível')}});
const base = semCache.rel_esporte_carregarIndicesPortal_();
assert.equal(base['5598991234501'].ciclismo, true,'Fallback mantém funcionamento sem cache');
assert.equal(leituras,12);

console.log('OK: cache esportivo 120 segundos, invalidação e fallback sem dados pessoais.');
