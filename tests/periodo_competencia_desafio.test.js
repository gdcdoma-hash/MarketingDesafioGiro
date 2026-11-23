'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const matriz=(h,rows)=>({getDataRange:()=>({getDisplayValues:()=>[h,...rows]})});
const tabela=abas=>({getSheetByName:n=>abas[n]||null});
const marketing=tabela({Marketing:matriz(['REF','ID_DGMB','NOME_ORIGEM','TIPO','STATUS'],
  [['REF_TESTE','','Origem Fictícia','APOIADOR','ATIVO']])});
const portal=tabela({
  DadosPessoais:matriz(['ID_DGMB','nome','Cidade-UF','whatsapp'],
    [['T1','Pessoa Teste','Cidade LAB - MA','']]),
  ListaDesafios:matriz(['id_Desafio_lista','Nome_Desafio','Tipo','Periodo','Data_Inicio'],
    [
      ['601','Desafio Fictício Dezembro','Normal','dezembro/2026','2026-11-21'],
      ['701','Desafio Fictício Janeiro','Normal','janeiro/2027','2026-12-20']
    ]),
  dgmbDesafios:matriz([
    'Timestamp','ID_DGMB','Observacao','REF_MARKETING',
    'Status_Usuario_Desafio','Status_Desafio','periodo_desafio'
  ],[
    ['2026-11-23','T1','[ID_DESAFIO:601]','REF_TESTE','EM_ANDAMENTO','Ativo','novembro/2026'],
    ['2026-12-15','T1','[ID_DESAFIO:601]','REF_TESTE','EM_ANDAMENTO','Ativo','dezembro/2026'],
    ['2026-12-21','T1','[ID_DESAFIO:701]','REF_TESTE','EM_ANDAMENTO','Ativo','dezembro/2026']
  ])
});
const ctx=vm.createContext({
 dg_abrirPlanilhaPortal_:()=>portal,
 dg_abrirPlanilhaMarketingRelacionamento_:()=>marketing,
 dg_configPlanilhas_:()=>({ambiente:'PROD'})
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','Code.js'),'utf8'),ctx);
const nov=ctx.obterDadosPainel('novembro/2026','');
const dez=ctx.obterDadosPainel('dezembro/2026','');
const jan=ctx.obterDadosPainel('janeiro/2027','');
assert.equal(nov.totalPeriodo,0,'Inscrição antecipada não pertence a novembro');
assert.equal(dez.totalPeriodo,2,'Competência dezembro independe da data de inscrição');
assert.equal(dez.totalAtribuidas,2);
assert.equal(ctx.obterDadosPainel('dezembro/2026','601').totalPeriodo,2);
assert.equal(jan.totalPeriodo,1,'Inscrição de dezembro para janeiro pertence a janeiro');
assert.equal(ctx.contarInscricoesMarketing_('REF_TESTE','dezembro/2026',portal,'601'),2);
assert.equal(ctx.contarInscricoesMarketing_('REF_TESTE','janeiro/2027',portal,'701'),1);
console.log('OK: Marketing atribui por competência do desafio e não por abertura ou data de inscrição.');
