'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const codigo=fs.readFileSync(path.join(root,'Code.js'),'utf8');
const multi=fs.readFileSync(path.join(root,'MarketingMultidesafios.js'),'utf8');
const matriz=(h,rows)=>({getDataRange(){return {getDisplayValues(){return [h,...rows]}}}});
const portal={
  getSheetByName(nome) {
    if(nome==='ListaDesafios')return matriz(
      ['id_Desafio_lista','id_desafio_base','Nome_Desafio','Tipo','Periodo','Data_Inicio','Data_Fim'],
      [
        ['501','DES_NOV','Desafio de Novembro','Normal','novembro/2026','2026-11-01','2026-11-30'],
        ['601','DES_DEZ_A','Desafio Dezembro A','Normal','dezembro/2026','2026-11-20','2026-12-31'],
        ['602','DES_DEZ_B','Desafio Dezembro B','Normal','dezembro/2026','2026-12-10','2026-12-31'],
        ['701','DES_JAN','Desafio Janeiro','Normal','janeiro/2027','2026-12-20','2027-01-31']
      ]);
    if(nome==='DadosPessoais')return matriz(['ID_DGMB','nome','Cidade-UF','whatsapp'],
      [['LAB001','Pessoa Teste','Cidade Teste - MA','']]);
    if(nome==='dgmbDesafios')return matriz(
      ['Timestamp','ID_DGMB','Observacao','Status_Usuario_Desafio','Status_Desafio','REF_MARKETING'],
      [
        ['2026-11-12','LAB001','[ID_DESAFIO:501]','EM_ANDAMENTO','Ativo','REF_TESTE'],
        // Dezembro tem inscrições iniciadas em NOVEMBRO.
        ['2026-11-22','LAB001','[ID_DESAFIO:601]','EM_ANDAMENTO','Ativo','REF_TESTE'],
        // E pode receber inscrições DURANTE o próprio mês.
        ['2026-12-12','LAB001','[ID_DESAFIO:602]','EM_ANDAMENTO','Ativo','REF_TESTE'],
        // Janeiro começa a receber inscrição em dezembro.
        ['2026-12-22','LAB001','[ID_DESAFIO:701]','EM_ANDAMENTO','Ativo','REF_TESTE'],
        ['2026-11-26','LAB001','[ID_DESAFIO:601]','CANCELADO','Ativo','REF_TESTE']
      ]);
    return null;
  }
};
const marketing={getSheetByName(nome) {
  if(nome==='Marketing')return matriz(['REF','ID_DGMB','NOME_ORIGEM','TIPO','STATUS'],
    [['REF_TESTE','','Equipe Fictícia','APOIADOR','ATIVO']]);
  return null;
}};
let leiturasCatalogo=0;
const baseGet=portal.getSheetByName.bind(portal);
portal.getSheetByName=(nome)=>{
  if(nome==='ListaDesafios')leiturasCatalogo++;
  return baseGet(nome);
};
let propriedades={
  METAS_MARKETING_V2:JSON.stringify({
    'novembro/2026':{geral:50,desafios:{'501':30}},
    'dezembro/2026':{geral:200,desafios:{'601':60,'602':40}},
    'janeiro/2027':{geral:70,desafios:{'701':70}}
  })
};
let gravacoes=0;
const ctx=vm.createContext({
  dg_abrirPlanilhaMarketingRelacionamento_:()=>marketing,
  dg_abrirPlanilhaPortal_:()=>portal,
  PropertiesService:{getScriptProperties(){return {
    getProperty:k=>propriedades[k]||'',
    setProperty(k,v){gravacoes++;propriedades[k]=v}
  }}}
});
vm.runInContext(codigo,ctx,{filename:'Code.js'});
vm.runInContext(multi,ctx,{filename:'MarketingMultidesafios.js'});

test('Inscrição de novembro para desafio de dezembro pertence a dezembro',()=>{
  const novembro=ctx.obterDadosPainelMarketingV2('novembro/2026','');
  const dezembro=ctx.obterDadosPainelMarketingV2('dezembro/2026','');
  const janeiro=ctx.obterDadosPainelMarketingV2('janeiro/2027','');
  assert.equal(novembro.totalPeriodo,1);
  assert.equal(dezembro.totalPeriodo,2,'Uma inscrição em novembro e outra em dezembro');
  assert.equal(dezembro.totalAtribuidas,2);
  assert.equal(janeiro.totalPeriodo,1,'Inscrição em dezembro para janeiro');
  assert.equal(dezembro.desafios.length,2);
  assert.deepEqual(Array.from(dezembro.desafios.map(x=>x.id)),['601','602']);
  assert.equal(ctx.obterDadosPainelMarketingV2('dezembro/2026','601').totalPeriodo,1);
  assert.equal(ctx.obterDadosPainelMarketingV2('dezembro/2026','602').totalPeriodo,1);
});

test('Trocar mês consulta metas e desafios próprios sem salvar nem ler inscrições',()=>{
  const antes=gravacoes;
  const d=ctx.obterMetasPeriodoMarketingV2('dezembro/2026');
  assert.equal(d.status,'OK');
  assert.equal(d.metaGeral,200);
  assert.equal(d.desafios.length,2);
  assert.equal(d.desafios[0].meta,60);
  assert.equal(d.desafios[1].meta,40);
  assert.equal(gravacoes,antes,'Consulta deve ser somente leitura');
  const n=ctx.obterMetasPeriodoMarketingV2('novembro/2026');
  assert.equal(n.desafios.length,1);
  assert.equal(n.desafios[0].id,'501');
  assert.equal(n.metaGeral,50);
  const j=ctx.obterMetasPeriodoMarketingV2('janeiro/2027');
  assert.equal(j.desafios[0].id,'701');
});

test('Salvar metas de dezembro não aceita desafio de novembro',()=>{
  const antes=gravacoes;
  const resultado=ctx.salvarMetasMarketingV2({periodo:'dezembro/2026',
    metaGeral:100,metasDesafios:{'501':99}});
  assert.equal(resultado.status,'ERRO');
  assert.equal(gravacoes,antes);
  assert.equal(JSON.parse(propriedades.METAS_MARKETING_V2)['novembro/2026'].geral,50);
});

test('Meta zero é respeitada e não substituída por meta padrão',()=>{
  const r=ctx.salvarMetasMarketingV2({periodo:'dezembro/2026',
    metaGeral:0,metasDesafios:{'601':0}});
  assert.equal(r.status,'OK');
  assert.equal(r.metaGeral,0);
  const d=ctx.obterDadosPainelMarketingV2('dezembro/2026','');
  assert.equal(d.metaGeral,0);
  assert.equal(d.meta,0);
  assert.equal(d.percentualMeta,0);
  assert.equal(ctx.obterMetasPeriodoMarketingV2('dezembro/2026').metaGeral,0);
  assert.equal(JSON.parse(propriedades.METAS_MARKETING_V2)['novembro/2026'].geral,50);
});

test('Período inexistente ou metas inválidas não alteram configurações',()=>{
  const antes=gravacoes;
  const casos=[
    {periodo:'fevereiro/2027',metaGeral:20,metasDesafios:{}},
    {periodo:'dezembro/2026',metaGeral:-1,metasDesafios:{}},
    {periodo:'dezembro/2026',metaGeral:1.5,metasDesafios:{}},
    {periodo:'dezembro/2026',metaGeral:20,metasDesafios:{'601':-10}},
    {periodo:'dezembro/2026',metaGeral:20,metasDesafios:{'601':1.5}}
  ];
  for(const entrada of casos) assert.equal(
    ctx.salvarMetasMarketingV2(entrada).status,'ERRO',JSON.stringify(entrada));
  assert.equal(gravacoes,antes);
});
