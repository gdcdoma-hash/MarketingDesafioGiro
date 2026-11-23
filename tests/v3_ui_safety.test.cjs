'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../v3/Index.html'),'utf8');
const raw=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(raw,'Script V3 deve existir no HTML');
const start=raw.indexOf('(async function iniciar(){');
assert.ok(start>0,'Bootstrap deve ser separado do módulo para teste');
const source=raw.slice(0,start).replace(/<\?= area \?>/g,'marketing');
new vm.Script(source,{filename:'V3-frontend.js'});

function setup(){
 const elements=new Map(),opened=[],warnings=[],calls=[];
 function elem(id){
  if(!elements.has(id))elements.set(id,{
   value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},
   classList:{toggle(){}},querySelectorAll(){return []},
   showModal(){},close(){},addEventListener(){},focus(){},
  });
  return elements.get(id);
 }
 const queue=[];
 const context=vm.createContext({
  document:{getElementById:elem,querySelectorAll(){return []}},
  window:{open(...args){opened.push(args);}},
  navigator:{clipboard:{writeText(){return Promise.resolve();}}},
  console,
  confirm(){return true;},
  setTimeout(){return 1;},clearTimeout(){},
 });
 vm.runInContext(source,context,{filename:'V3-frontend.js'});
 const state=vm.runInContext('state',context);
 state.opt={ambiente:'PROD',edicao:true,desafios:[{id:'9001',nome:'Desafio de Exemplo',periodo:'dezembro/2026'}],
  refAtivas:[],etapas:[],situacoes:[],periodos:[]};
 // Substitui somente a ponte de teste. Nenhuma chamada real ao GAS.
 context.api=(name,...args)=>new Promise((resolve,reject)=>{
  queue.push({name,args,resolve,reject});
  calls.push(name);
 });
 return {context,state,elem,opened,queue,calls,warnings};
}
const base={
 telefone:'5598991234501',nome:'Pessoa LAB',etapa:'PARA_CONTATAR',situacao:'PODE_CONTATAR',
 resultado:'NAO_DEFINIDO',validade:'VALIDO'
};
function prepare(s,c){
 s.state.ultimo=c;
 s.elem('edit-etapa').value=c.etapa;
 s.elem('edit-situacao').value=c.situacao;
 s.elem('convite-desafio').value='9001';
 s.elem('convite-ref').value='LAB_EXEMPLO';
}
async function flush(){await Promise.resolve();await Promise.resolve();}
test('Contato que recusou, inválido ou sem consentimento não abre WhatsApp',()=>{
 const scenarios=[
  {etapa:'NAO_CONTATAR'},
  {situacao:'NAO_DESEJA_CONTATO'},
  {situacao:'CONTATO_INADEQUADO'},
  {situacao:'SEM_INTERESSE'},
  {resultado:'NAO_CONTATAR'},
  {resultado:'SEM_INTERESSE'},
  {validade:'INVALIDO'}
 ];
 for(const item of scenarios){
  const s=setup(),c={...base,...item};prepare(s,c);
  assert.ok(s.context.motivoBloqueioConvite(c,c.etapa,c.situacao),JSON.stringify(item));
  s.context.abrirConvite();
  assert.equal(s.opened.length,0,JSON.stringify(item));
 }
});
test('Alteração para não contatar ainda não salva também impede convite',()=>{
 const s=setup();prepare(s,base);
 s.elem('edit-etapa').value='NAO_CONTATAR';
 assert.ok(s.context.motivoBloqueioConvite(s.state.ultimo,s.elem('edit-etapa').value,s.elem('edit-situacao').value));
 s.context.abrirConvite();
 assert.equal(s.opened.length,0);
});
test('LAB e PROD somente leitura bloqueiam WhatsApp mesmo com contato válido',()=>{
 for(const opt of [{ambiente:'LAB',edicao:true},{ambiente:'PROD',edicao:false}]){
  const s=setup();prepare(s,base);Object.assign(s.state.opt,opt);
  s.context.atualizarBloqueioConvite();
  assert.equal(s.elem('convite-whats').disabled,true);
  s.context.abrirConvite();
  assert.equal(s.opened.length,0);
 }
});
test('Convite manual permitido abre wa.me mas não envia mensagem',()=>{
 const s=setup();prepare(s,base);s.context.abrirConvite();
 assert.equal(s.opened.length,1);
 const [url,target,features]=s.opened[0];
 assert.match(url,/^https:\/\/wa\.me\/5598991234501\?text=/);
 assert.equal(target,'_blank');assert.match(features,/noopener/);
 const msg=decodeURIComponent(url.split('?text=')[1]);
 assert.match(msg,/Desafio de Exemplo/);
 assert.match(msg,/dezembro\/2026/);
 assert.match(msg,/\?ref=LAB_EXEMPLO/);
});
test('Troca rápida de mês não permite resposta de Marketing antiga',async()=>{
 const s=setup();s.elem('m-busca-ref').value='';
 const mk=n=>({status:'OK',dados:{
  total:n,atribuido:1,direto:0,naoCadastrada:0,
  meta:100,percentual:n,desafios:[],divulgadores:[],invalido:false
 }});
 s.elem('m-periodo').value='novembro/2026';s.elem('m-desafio').value='';
 const old=s.context.carregarMarketing();
 s.elem('m-periodo').value='dezembro/2026';
 const current=s.context.carregarMarketing();
 assert.equal(s.queue.length,2);
 s.queue[1].resolve(mk(22));await current;
 assert.equal(s.elem('m-total').textContent,'22');
 s.queue[0].resolve(mk(11));await old;
 assert.equal(s.elem('m-total').textContent,'22');
});
test('Troca rápida de filtros não permite contatos antigos na tela',async()=>{
 const s=setup();
 for(const id of ['r-busca','r-esporte','r-etapa','r-situacao','r-origem'])s.elem(id).value='';
 s.elem('r-esporte').value='TODOS';s.elem('r-etapa').value='PADRAO';s.elem('r-situacao').value='TODOS';
 const make=total=>({status:'OK',dados:{total,pagina:1,paginas:1,
  indicadores:{},origens:[],registros:[]}});
 s.elem('r-busca').value='primeiro';const old=s.context.carregarContatos();
 s.elem('r-busca').value='segundo';const current=s.context.carregarContatos();
 assert.equal(s.queue.length,2);
 s.queue[1].resolve(make(2));await current;
 assert.match(s.elem('r-total').textContent,/2 contato/);
 s.queue[0].resolve(make(1));await old;
 assert.match(s.elem('r-total').textContent,/2 contato/);
});
test('CSV alterado após pré-análise exige análise nova antes de importar',async()=>{
 const s=setup();
 s.elem('csv-texto').value='Pessoa Exemplo;98991234567;Cidade LAB;MA';
 s.elem('csv-confirmar').disabled=true;
 const pending=s.context.analisarImportacao();
 assert.equal(s.queue[0].name,'v3_analisarImportacao');
 s.queue[0].resolve({status:'OK',dados:{total:1,novos:1,repetidos:0,invalidos:0,linhasInvalidas:[]}});
 await pending;
 assert.equal(s.elem('csv-confirmar').disabled,false);
 s.elem('csv-texto').value='Pessoa Diferente;98991234567;Cidade LAB;MA';
 await s.context.confirmarImportacao();
 assert.equal(s.elem('csv-confirmar').disabled,true);
 assert.equal(s.calls.filter(x=>x==='v3_confirmarImportacao').length,0);
});
test('Resposta de pré-análise antiga não reativa botão depois de alteração',async()=>{
 const s=setup();
 s.elem('csv-texto').value='Pessoa Exemplo;98991234567;Cidade LAB;MA';
 const pending=s.context.analisarImportacao();
 s.elem('csv-texto').value='Outra Pessoa;98991234588;Cidade LAB;MA';
 s.context.invalidarPreviaImportacao();
 s.queue[0].resolve({status:'OK',dados:{total:1,novos:1,repetidos:0,invalidos:0,linhasInvalidas:[]}});
 await pending;
 assert.equal(s.elem('csv-confirmar').disabled,true);
});

test('Contato bloqueado pelo servidor não abre convite após edição não salva',()=>{
 const s=setup();
 prepare(s,{...base,bloqueado:true});
 s.elem('edit-etapa').value='PARA_CONTATAR';
 s.elem('edit-situacao').value='PODE_CONTATAR';
 s.context.atualizarBloqueioConvite();
 assert.equal(s.elem('convite-whats').disabled,true);
 s.context.abrirConvite();
 assert.equal(s.opened.length,0);
});
test('Filtro rápido Retornar Hoje envia flag para consulta do Relacionamento',()=>{
 const s=setup();
 for(const id of ['r-busca','r-esporte','r-etapa','r-situacao','r-origem'])s.elem(id).value='';
 s.elem('r-retorno').checked=true;
 const filter=s.context.filtroContatos();
 assert.equal(filter.retornoPendente,true);
 assert.equal(filter.pagina,1);
 s.elem('r-retorno').checked=false;
 assert.equal(s.context.filtroContatos().retornoPendente,false);
});
test('Painel de contatos inclui retorno do dia e bloqueados entre os indicadores',()=>{
 const s=setup();
 s.state.contatos={indicadores:{RETORNAR_HOJE:2,BLOQUEADOS:1},
  origens:[],registros:[],total:4,pagina:1,paginas:1};
 s.context.renderContatos();
 assert.match(s.elem('r-indicadores').innerHTML,/Retornar hoje \/ atrasados/);
 assert.match(s.elem('r-indicadores').innerHTML,/Bloqueados para contato/);
});
