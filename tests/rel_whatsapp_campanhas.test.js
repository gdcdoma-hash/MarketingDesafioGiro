'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const aberto = [];
const avisos = [];
const context = {
  window: { open: (...args) => aberto.push(args) },
  document: {},
  navigator: {},
  mensagem: text => avisos.push(text)
};
vm.createContext(context);
let script = fs.readFileSync(
  path.join(__dirname, '..', 'RelContatosScripts.html'), 'utf8'
).replace(/^\s*<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
const anchor = 'return Object.freeze({ iniciar: iniciar,';
assert.ok(script.includes(anchor), 'A assinatura pública do módulo mudou');
script = script.replace(anchor,
  "return Object.freeze({ mensagemTeste: montarMensagemConvite, abrirTeste: abrirWhatsApp, definirRefTeste: ref => {e.ref = {value:ref};e.aviso = {textContent:'',hidden:true,classList:{toggle(){}}};},");
script += '\nthis.apiTesteWhatsApp = relContatos;';
vm.runInContext(script, context);
const api = context.apiTesteWhatsApp;
const pessoa = {
  telefoneNormalizado: '5598991234567',
  nomeExibicao: 'Maria Oliveira',
  etapa: 'PARA_CONTATAR',
  situacao: 'PODE_CONTATAR'
};
const transmissao = api.mensagemTeste(pessoa, 'TRANSMISSAO', '123');
const coracao = api.mensagemTeste(pessoa, 'CORACAO', '123');
assert.match(transmissao, /Olá, Maria/);
assert.match(transmissao, /Medalha Transmissão/);
assert.match(transmissao, /pedalada/);
assert.doesNotMatch(transmissao, /Medalha Coração/);
assert.match(coracao, /Medalha Coração/);
assert.match(coracao, /corre ou caminha/);
assert.doesNotMatch(coracao, /Medalha Transmissão/);
assert.ok(transmissao.includes('https://desafiogiro.gmbd.com.br/?ref=123'));
assert.ok(coracao.includes('https://desafiogiro.gmbd.com.br/?ref=123'));
assert.ok(!api.mensagemTeste(pessoa, 'OUTRO', '123'), 'Desafio inválido não pode gerar mensagem');
api.definirRefTeste('471');
api.abrirTeste(pessoa, 'TRANSMISSAO');
assert.equal(aberto.length, 1, 'Apenas abre uma janela do WhatsApp');
assert.ok(aberto[0][0].startsWith('https://wa.me/5598991234567?text='));
const textoWhatsApp = decodeURIComponent(aberto[0][0].split('?text=')[1]);
assert.match(textoWhatsApp, /Medalha Transmissão/);
assert.match(textoWhatsApp, /\?ref=471/);
assert.equal(aberto[0][1], '_blank');
api.abrirTeste({ ...pessoa, etapa: 'NAO_CONTATAR' }, 'TRANSMISSAO');
api.abrirTeste({ ...pessoa, situacao: 'NAO_DESEJA_CONTATO' }, 'CORACAO');
api.abrirTeste(pessoa, '');
assert.equal(aberto.length, 1, 'Bloqueios e falta de escolha não abrem WhatsApp');
assert.equal(api.mensagemTeste(pessoa, 'CORACAO', '').includes('?ref='), false, 'Convite geral não deve inventar REF');
console.log('OK: texto por desafio, REF, abertura manual e bloqueios de WhatsApp.');
