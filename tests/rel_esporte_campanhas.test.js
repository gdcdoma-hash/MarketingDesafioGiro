'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bases = {
  DadosPessoais: [
    { ID_DGMB: '1', whatsapp: '5598999999991' },
    { ID_DGMB: '2', whatsapp: '5598999999992' },
    { ID_DGMB: '3', whatsapp: '5598999999993' },
    { ID_DGMB: '4', whatsapp: '5598999999994' },
    { ID_DGMB: '5', whatsapp: '5598999999995' },
    { ID_DGMB: '6', whatsapp: '5598999999995' }
  ],
  dgmbDesafios: [
    { ID_DGMB: '1', Modalidade_Esportiva: 'CICLISMO' },
    { ID_DGMB: '2', Modalidade_Esportiva: 'CAMINHADA_CORRIDA' },
    { ID_DGMB: '3', Modalidade_Esportiva: 'CICLISMO' },
    { ID_DGMB: '3', Modalidade_Esportiva: 'CAMINHADA_CORRIDA' },
    { ID_DGMB: '4', Observacao: '[ID_DESAFIO:166]' },
    { ID_DGMB: '5', Modalidade_Esportiva: 'CICLISMO' },
    { ID_DGMB: '6', Modalidade_Esportiva: 'CAMINHADA_CORRIDA' }
  ],
  ListaDesafios: [
    { id_Desafio_lista: '166', Nome_Desafio: 'MEDALHA SELIM' }
  ]
};
const contexto = {
  dg_abrirPlanilhaPortal_: () => ({}),
  lerAbaComoObjetos_: (_portal, aba) => bases[aba],
  rel_telefone_normalizar_: numero => ({
    valido: Boolean(numero), telefoneNormalizado: String(numero)
  }),
  extrairIdDesafio_: texto => (String(texto || '').match(/\[ID_DESAFIO:(\d+)\]/) || [])[1] || ''
};
vm.createContext(contexto);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'RelEsporteService.js'), 'utf8'), contexto);
const indice = contexto.rel_esporte_carregarIndicesPortal_();
function perfil(numero, modalidade = 'NAO_INFORMADO', eCiclista = 'NAO_CONFIRMADO') {
  return contexto.rel_esporte_classificarContato_({
    telefoneNormalizado: numero, modalidade, eCiclista
  }, indice).perfilEsportivo;
}
assert.equal(perfil('5598999999991'), 'CICLISMO');
assert.equal(perfil('5598999999992'), 'CAMINHADA_CORRIDA');
assert.equal(perfil('5598999999993'), 'AMBOS');
assert.equal(perfil('5598999999994'), 'CICLISMO', 'legado reconhecido por desafio inequívoco');
assert.equal(perfil('5598999999995'), 'NAO_IDENTIFICADO', 'telefone compartilhado não deve gerar suposição');
assert.equal(perfil('telefone-fora-do-portal'), 'NAO_IDENTIFICADO');
assert.equal(perfil('telefone-fora-do-portal', 'CAMINHADA'), 'CAMINHADA_CORRIDA');
assert.equal(perfil('5598999999991', 'CAMINHADA', 'SIM'), 'AMBOS');
assert.equal(contexto.rel_esporte_filtrar_('AMBOS', 'CICLISMO'), true);
assert.equal(contexto.rel_esporte_filtrar_('AMBOS', 'CAMINHADA_CORRIDA'), true);
assert.equal(contexto.rel_esporte_filtrar_('NAO_IDENTIFICADO', 'CAMINHADA_CORRIDA'), false);
assert.equal(contexto.rel_esporte_flags_('GRAVEL').ciclismo, true);
assert.equal(contexto.rel_esporte_flags_('CAMINHADA_CORRIDA').corrida, true);
console.log('OK: 13 verificações de identificação esportiva (sem dados reais).');
