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

test('Editar somente a etapa preserva MTB, nome e observações existentes',async()=>{
 const t=setup();
 t.state.opt.etapas=['PARA_CONTATAR','EM_CONVERSA','RETORNAR_DEPOIS','NAO_CONTATAR'];
 t.state.opt.situacoes=['PODE_CONTATAR','NAO_CLASSIFICADO'];
 const c={...base,bloqueado:false,versao:'versao-ficticia-123',
  modalidade:'MTB',nomeContato:'Nome original',observacao:'Observação prévia',
  retorno:'',exibicao:'(98) 99123-4501',cidadeUf:'Cidade - MA',perfil:'CICLISMO'};
 t.context.abrirContato(c);
 assert.equal(t.elem('edit-modalidade').value,'MTB');
 t.elem('edit-etapa').value='EM_CONVERSA';
 const pending=t.context.salvarContato();
 assert.equal(t.queue.length,1);
 assert.equal(t.queue[0].name,'v3_salvarContato');
 const dados=t.queue[0].args[0];
 assert.equal(dados.telefone,c.telefone);
 assert.equal(dados.versao,c.versao);
 assert.equal(dados.etapa,'EM_CONVERSA');
 assert.equal(Object.hasOwn(dados,'modalidade'),false,'MTB não pode ser sobrescrito');
 assert.equal(Object.hasOwn(dados,'nomeContato'),false);
 assert.equal(Object.hasOwn(dados,'observacao'),false);
 assert.equal(Object.hasOwn(dados,'situacao'),false);
 t.queue[0].resolve({status:'OK',mensagem:'Salvo',dados:{}});
 await pending;
});
test('Reativação pelo formulário envia justificativa e confirmação ao servidor',async()=>{
 const t=setup();
 t.state.opt.etapas=['PARA_CONTATAR','NAO_CONTATAR'];
 t.state.opt.situacoes=['PODE_CONTATAR','NAO_DESEJA_CONTATO'];
 const c={...base,bloqueado:true,versao:'versao-antiga',etapa:'NAO_CONTATAR',
  situacao:'NAO_DESEJA_CONTATO',modalidade:'NAO_INFORMADO',nomeContato:'',
  observacao:'',retorno:'',exibicao:'(98) 99123-4501',cidadeUf:'Cidade - MA',
  perfil:'NAO_IDENTIFICADO'};
 t.context.abrirContato(c);
 t.elem('edit-etapa').value='PARA_CONTATAR';
 t.elem('edit-situacao').value='PODE_CONTATAR';
 t.context.prompt=()=> 'Solicitação documentada e confirmada pelo titular';
 const pending=t.context.salvarContato();
 assert.equal(t.queue[0].name,'v3_salvarContato');
 const payload=t.queue[0].args[0];
 assert.equal(payload.autorizarReativacao,true);
 assert.match(payload.motivoReativacao,/Solicitação documentada/);
 t.queue[0].resolve({status:'OK',dados:{}});
 await pending;
});

test('Nova experiência: busca visível, filtros recolhidos e resultado em um modal curto',()=>{
 assert.match(html,/Localizar contato/);
 assert.match(html,/class="advanced-filters"/);
 assert.match(html,/id="modal-resultado"/);
 assert.match(html,/Registrar resultado/);
 assert.match(html,/WhatsApp/);
 const t=setup();
 t.state.contatos={indicadores:{PARA_CONTATAR:2,BLOQUEADOS:1},origens:[],
  total:1,pagina:1,paginas:1,
  registros:[{...base,versao:'fake-v',origens:[],perfil:'CICLISMO',exibicao:'(98) 99123-4501',
   cidadeUf:'Cidade - MA',idDgmb:'LAB01',retorno:'',bloqueado:false}]};
 t.context.renderContatos();
 assert.match(t.elem('r-lista').innerHTML,/data-chat-contact="0"/);
 assert.match(t.elem('r-lista').innerHTML,/data-result-contact="0"/);
 assert.match(t.elem('r-lista').innerHTML,/data-open-contact="0"/);
});
test('Registro rápido: não escolhe resposta por conta própria, exige seleção',async()=>{
 const t=setup(),c={...base,versao:'versao-lab',bloqueado:false};
 t.context.abrirResultado(c);
 assert.equal(t.elem('resultado-salvar').disabled,true);
 assert.equal(t.state.resultadoSelecionado,'');
 t.context.selecionarResultado('AGUARDANDO_RESPOSTA');
 assert.equal(t.elem('resultado-salvar').disabled,false);
 const pending=t.context.salvarResultadoRapido();
 assert.equal(t.queue[0].name,'v3_salvarContato');
 const data=t.queue[0].args[0];
 assert.equal(data.etapa,'AGUARDANDO_RESPOSTA');
 assert.equal(data.resultadoContato,'AGUARDANDO_RESPOSTA');
 assert.equal(data.versao,'versao-lab');
 t.queue[0].resolve({status:'OK',dados:{}});
 await pending;
});
test('Registro rápido retorno exige uma data antes de alterar o cadastro',async()=>{
 const t=setup();
 t.context.abrirResultado({...base,versao:'versao',bloqueado:false});
 t.context.selecionarResultado('RETORNAR_DEPOIS');
 assert.equal(t.elem('resultado-data-area').hidden,false);
 await t.context.salvarResultadoRapido();
 assert.equal(t.queue.length,0);
 t.elem('resultado-data').value='2026-12-07';
 const pending=t.context.salvarResultadoRapido();
 const data=t.queue[0].args[0];
 assert.equal(data.etapa,'RETORNAR_DEPOIS');
 assert.equal(data.retorno,'2026-12-07');
 assert.equal(data.resultadoContato,'RETORNAR_DEPOIS');
 t.queue[0].resolve({status:'OK',dados:{}});
 await pending;
});
test('Registro rápido para Sem Interesse bloqueia abordagens futuras',async()=>{
 const t=setup();
 t.context.abrirResultado({...base,versao:'versao',bloqueado:false});
 t.context.selecionarResultado('SEM_INTERESSE');
 const pending=t.context.salvarResultadoRapido();
 const data=t.queue[0].args[0];
 assert.equal(data.etapa,'NAO_CONTATAR');
 assert.equal(data.situacao,'SEM_INTERESSE');
 assert.equal(data.resultadoContato,'SEM_INTERESSE');
 t.queue[0].resolve({status:'OK',dados:{}});
 await pending;
});
test('WhatsApp direto funciona sem desafio e mantém convite opcional',()=>{
 const t=setup(),c={...base,bloqueado:false};
 t.elem('r-desafio-convite').value='';
 t.context.abrirMensagemRapida(c);
 assert.equal(t.opened.length,1);assert.equal(t.opened[0][0],'https://wa.me/5598991234501');
 t.elem('r-desafio-convite').value='9001';
 t.elem('r-ref-convite').value='LAB_EXEMPLO';
 t.context.abrirMensagemRapida(c);
 assert.equal(t.opened.length,2);
 assert.match(t.opened[1][0],/wa\.me\/5598991234501/);
 assert.match(decodeURIComponent(t.opened[1][0]),/\?ref=LAB_EXEMPLO/);
 assert.equal(t.calls.includes('v3_salvarContato'),false);
 t.state.opt.ambiente='LAB';
 t.context.abrirMensagemRapida(c);
 assert.equal(t.opened.length,2,'LAB nunca abre nova conversa');
});
test('CSV Google Contatos: identifica telefone correto em meio a dezenas de campos',()=>{
 const t=setup();
 t.elem('csv-texto').value=
  '"Name","Given Name","Phone 1 - Type","Phone 1 - Value","Phone 2 - Value","Notes","Address 1 - City","Address 1 - Region"\n'+
  '"LAB Exemplo","Exemplo","Mobile","+55 (98) 99123-4501","(98) 99123-4502","Anotação com vírgula, e\nquebra de linha","Cidade LAB","MA"\n'+
  '"LAB Sem Fone","Teste","","","","Sem telefone","",""';
 const dados=t.context.dadosCSV();
 assert.equal(dados.length,2);
 assert.equal(dados[0].nome,'LAB Exemplo');
 assert.match(dados[0].telefone,/99123-4501/);
 assert.match(dados[1].telefone,/99123-4502/);
 assert.equal(dados[0].uf,'MA');
 assert.equal(vm.runInContext('csvResumoLocal.semTelefone',t.context),1);
});
test('CSV semicolonado simples e repetido no arquivo não duplica telefone',()=>{
 const t=setup();
 t.elem('csv-texto').value=
  'LAB Pessoa 1;98991234567;Cidade LAB;MA\n'+
  'LAB Pessoa 1 duplicada;+55 98 99123-4567;Cidade LAB;MA\n'+
  'TESTE Pessoa 2;98991234568;Cidade LAB;MA';
 const dados=t.context.dadosCSV();
 assert.equal(dados.length,2);
 assert.equal(vm.runInContext('csvResumoLocal.repetidos',t.context),1);
 assert.equal(t.context.dadosFicticiosCSV(dados),true);
});
test('Google Contatos reais podem ser analisados no LAB, mas botão importar permanece bloqueado',async()=>{
 const t=setup();t.state.opt.ambiente='LAB';
 t.elem('csv-texto').value='Name,Phone 1 - Value\nPessoa Exemplo,98991234567';
 const task=t.context.analisarImportacao();
 assert.equal(t.queue[0].name,'v3_analisarImportacao');
 t.queue[0].resolve({status:'OK',dados:{novos:1,repetidos:0,invalidos:0}});
 await task;
 assert.equal(t.elem('csv-confirmar').disabled,true);
 assert.match(t.elem('csv-resultado').textContent,/arquivo real identificado/);
});
test('Arquivo CSV com mais de 300 telefones gera lotes de análise',async()=>{
 const t=setup();
 t.elem('csv-texto').value=Array.from({length:303},(_,i)=>
  'TESTE Pessoa '+i+';989912'+String(10000+i)).join('\n');
 const promise=t.context.analisarImportacao();
 assert.equal(t.queue.length,1);
 assert.equal(t.queue[0].name,'v3_analisarImportacao');
 assert.equal(t.queue[0].args[0].registros.length,300);
 t.queue[0].resolve({status:'OK',dados:{novos:300,repetidos:0,invalidos:0}});
 await flush();
 assert.equal(t.queue.length,2);
 assert.equal(t.queue[1].args[0].registros.length,3);
 t.queue[1].resolve({status:'OK',dados:{novos:3,repetidos:0,invalidos:0}});
 await promise;
 assert.equal(t.elem('csv-confirmar').disabled,false);
});

test('Prévia com contatos existentes e novos vínculos permite confirmar',async()=>{
 const t=setup();t.elem('csv-texto').value='LAB Pessoa;98991234567';t.elem('csv-origem').value='O1';
 const task=t.context.analisarImportacao();
 assert.equal(t.queue[0].args[0].origemId,'O1');
 t.queue[0].resolve({status:'OK',dados:{novos:0,repetidos:1,invalidos:0,novosVinculos:1}});
 await task;assert.equal(t.elem('csv-confirmar').disabled,false);
 assert.match(t.elem('csv-resultado').textContent,/ANÁLISE CONCLUÍDA/);
});
