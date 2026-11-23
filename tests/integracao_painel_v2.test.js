'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'Code.js'),'utf8');
const modulo=fs.readFileSync(path.join(root,'MarketingMultidesafios.js'),'utf8');
const baseHtml=fs.readFileSync(path.join(root,'Scripts.html'),'utf8');
const v2Html=fs.readFileSync(path.join(root,'ScriptsMultidesafios.html'),'utf8');
const index=fs.readFileSync(path.join(root,'Index.html'),'utf8');

function sheet(headers,records){
 return {getDataRange(){return {getDisplayValues(){return [headers,...records]}}}};
}
function book(ab){
 return {getSheetByName(name){return ab[name]||null;}};
}
const portal=book({
 DadosPessoais:sheet(['ID_DGMB','nome','Cidade-UF','whatsapp'],[
  ['T1','Pessoa Teste Um','Cidade LAB - MA',''],
  ['T2','Pessoa Teste Dois','Cidade LAB - MA','']
 ]),
 ListaDesafios:sheet(['id_Desafio_lista','id_desafio_base','Nome_Desafio','Tipo','Periodo','Data_Inicio'],[
  ['501','NOV','Desafio Novembro','Normal','novembro/2026','2026-11-01'],
  ['601','DEZ-A','Desafio Dezembro A','Normal','dezembro/2026','2026-11-20'],
  ['602','DEZ-B','Desafio Dezembro B','Normal','dezembro/2026','2026-12-10'],
  ['701','JAN','Desafio Janeiro','Normal','janeiro/2027','2026-12-20']
 ]),
 dgmbDesafios:sheet([
  'Timestamp','ID_DGMB','Observacao','Status_Usuario_Desafio','Status_Desafio',
  'REF_MARKETING','periodo_desafio'
 ],[
  ['2026-11-09','T1','[ID_DESAFIO:501]','EM_ANDAMENTO','Ativo','1145','novembro/2026'],
  ['2026-11-25','T1','[ID_DESAFIO:601]','EM_ANDAMENTO','Ativo','1145','novembro/2026'],
  ['2026-12-11','T2','[ID_DESAFIO:601]','EM_ANDAMENTO','Ativo','DESCONHECIDA','dezembro/2026'],
  ['2026-12-02','T1','[ID_DESAFIO:602]','EM_ANDAMENTO','Ativo','','dezembro/2026'],
  ['2026-11-28','T2','[ID_DESAFIO:602]','EM_ANDAMENTO','Ativo','constructor','novembro/2026'],
  ['2026-11-28','T2','[ID_DESAFIO:602]','DESISTENTE','Ativo','1145','novembro/2026'],
  ['2026-12-15','T1','[ID_DESAFIO:601]','EXPIRADO','Ativo','1145','dezembro/2026'],
  ['2026-12-16','T1','[ID_DESAFIO:602]','CANCELADO','Ativo','1145','dezembro/2026'],
  ['2026-12-20','T1','[ID_DESAFIO:701]','EM_ANDAMENTO','Ativo','1145','dezembro/2026']
 ])
});
const marketing=book({
 Marketing:sheet(['REF','ID_DGMB','NOME_ORIGEM','TIPO','STATUS'],[
  ['1145','','Equipe LAB','APOIADOR','ATIVO'],
  ['constructor','','Equipe Teste','APOIADOR','ATIVO'],
  ['REF.INVALIDA','','Código inválido','GRUPO','ATIVO']
 ])
});
let writes=0;
const properties={METAS_MARKETING_V2:JSON.stringify({
 'novembro/2026':{geral:99,desafios:{501:30}},
 'dezembro/2026':{geral:200,desafios:{601:60,602:40}},
 'janeiro/2027':{geral:50,desafios:{701:50}}
})};

function context(ambiente){
 const c=vm.createContext({
  dg_abrirPlanilhaMarketingRelacionamento_:()=>marketing,
  dg_abrirPlanilhaPortal_:()=>portal,
  dg_configPlanilhas_:()=>({ambiente}),
  dg_assertEscritaPermitida_:()=>{}, // metas V2 são exercitadas no teste isolado
  PropertiesService:{getScriptProperties(){return {
   getProperty(key){return properties[key]||''},
   setProperty(key,value){properties[key]=value;writes++}
  }}}
 });
 vm.runInContext(code,c,{filename:'Code.js'});
 vm.runInContext(modulo,c,{filename:'MarketingMultidesafios.js'});
 return c;
}

const prod=context('PROD');
const nov=prod.obterDadosPainelMarketingV2('novembro/2026');
const dec=prod.obterDadosPainelMarketingV2('dezembro/2026');
const jan=prod.obterDadosPainelMarketingV2('janeiro/2027');
assert.equal(nov.totalPeriodo,1);
assert.equal(dec.totalPeriodo,4,'Inscrições iniciadas em novembro pertencem a dezembro');
assert.equal(dec.totalGeralPeriodo,4);
assert.equal(dec.totalAtribuidas,2);
assert.equal(dec.totalDireto,1);
assert.equal(dec.totalRefNaoCadastradas,1);
assert.equal(jan.totalPeriodo,1,'Inscrição de dezembro pertence a janeiro');
assert.equal(dec.desafios.length,2);
assert.equal(dec.meta,200);
assert.equal(dec.desafios.find(x=>x.id==='601').inscricoes,2);
assert.equal(dec.desafios.find(x=>x.id==='601').refNaoCadastradas,1);
assert.equal(dec.desafios.find(x=>x.id==='602').inscricoes,2);
assert.equal(dec.desafios.find(x=>x.id==='602').direto,1);
assert.equal(dec.divulgadores.find(x=>x.ref==='constructor').inscricoes,1);
assert.ok(!dec.divulgadores.some(x=>x.ref==='REF.INVALIDA'));
assert.equal(dec.divulgadores.find(x=>x.ref==='1145').inscricoes,1);
const one=prod.obterDadosPainelMarketingV2('dezembro/2026','601');
assert.equal(one.totalPeriodo,2);
assert.equal(one.totalAtribuidas,1);
assert.equal(one.totalDireto,0);
assert.equal(one.totalRefNaoCadastradas,1);
assert.equal(one.meta,60);
const bad=prod.obterDadosPainelMarketingV2('novembro/2026','601');
assert.equal(bad.totalPeriodo,0);
assert.equal(bad.meta,0);
assert.equal(bad.filtroDesafioInvalido,true);
assert.equal(writes,0,'Abrir painel nunca grava metas');

const lab=context('LAB');
const labDec=lab.obterDadosPainelMarketingV2('dezembro/2026');
assert.ok(labDec.divulgadores.every(x=>x.link===''),'LAB não deve oferecer links públicos');

assert.match(index,/include\('StylesMultidesafios'\)/);
assert.match(index,/include\('ScriptsMultidesafios'\)/);
assert.match(index,/AMBIENTE LAB/);
function strip(text){return text.replace(/^\s*<script>\s*/,'').replace(/\s*<\/script>\s*$/,'')}
const calls=[];
const elements=Object.create(null);
for(const id of [
  'conteudo','periodo-configuracoes','periodo-atual',
  'meta-geral-configuracoes','metas-desafios-configuracoes',
  'btn-aplicar-configuracoes'
]) elements[id]={innerHTML:'',textContent:'',value:'',disabled:false};

const document={
 addEventListener(name,fn){assert.equal(name,'DOMContentLoaded')},
 getElementById(id){return elements[id]||null},
 querySelector(){return null},
 querySelectorAll(){return []}
};
const bridge={
 withSuccessHandler(callback){this.onSuccess=callback;return this},
 withFailureHandler(callback){this.onFailure=callback;return this},
 obterDadosPainelMarketingV2(periodo,id){calls.push({periodo,id});}
};
const ui=vm.createContext({document,console,google:{script:{run:bridge}}});
vm.runInContext(strip(baseHtml),ui,{filename:'Scripts.html'});
vm.runInContext(strip(v2Html),ui,{filename:'ScriptsMultidesafios.html'});
ui.carregarDados('dezembro/2026','601');
assert.deepEqual(calls,[{periodo:'dezembro/2026',id:'601'}],
  'Interface integrada deve chamar endpoint multidesafios');
ui.renderizar(labDec);
assert.match(elements.conteudo.innerHTML,/Desempenho por desafio/);
assert.match(elements.conteudo.innerHTML,/REF sem cadastro/);
assert.match(elements.conteudo.innerHTML,/Cód. DEZ-A/);
assert.doesNotMatch(elements.conteudo.innerHTML,/COPIAR LINK/,
  'LAB não oferece cópia de link vazio');
ui.renderizar(bad);
assert.match(elements.conteudo.innerHTML,/Desafio indisponível/);
assert.match(elements.conteudo.innerHTML,/não pertence ao mês/);

console.log('OK: UI V2 + Marketing/Relacionamento; competências, metas e REF segura no LAB.');
