const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
function contexto(extra={}) { const c={console,Date,Number,String,Object,Array,Math,RegExp,JSON,...extra}; vm.createContext(c); return c; }
function executar(c, arquivo) { vm.runInContext(fs.readFileSync(arquivo,'utf8').replace(/^<script>|<\/script>$/gm,''),c,{filename:arquivo}); }

// As fixtures reais passam pelo mesmo interpretador e extrator usados pela interface.
const front=contexto({document:{}}); executar(front,'RelGoogleContatos.html'); front.relGoogleContatos=vm.runInContext('relGoogleContatos',front);
function lerFixture(nome) { return front.relGoogleContatos.extrairRegistros(front.relGoogleContatos.interpretarCsv(fs.readFileSync('tests/fixtures/'+nome,'utf8'))); }
const en=lerFixture('google-contacts-en.csv'), pt=lerFixture('google-contacts-pt.csv');
assert.equal(en[0].nome,'Silva, Maria'); assert.equal(en[0].telefones.length,2);
assert.equal(en[1].nome,'João \"Pedal\"'); assert.equal(pt[0].email,'ana@example.com');
assert.throws(()=>lerFixture('google-contacts-sem-telefone.csv'),/Nenhuma coluna de telefone/);
const linhasEn=front.relGoogleContatos.interpretarCsv(fs.readFileSync('tests/fixtures/google-contacts-en.csv','utf8'));
assert.equal(linhasEn[1][0],'Silva, Maria'); assert.equal(linhasEn[2][0],'João \"Pedal\"');

// Normalização, duplicidade simples, conflito e limites.
const back=contexto(); executar(back,'RelTelefoneNormalizer.js');
back.REL_CONFIG={ABAS:{GOOGLE_CONTATOS:{NOME:'GoogleContatos',CABECALHOS:['TELEFONE_NORMALIZADO','NOME_GOOGLE','TELEFONE_ORIGINAL','EMAIL','DATA_IMPORTACAO','ATIVO']}}};
back.dg_abrirPlanilhaMarketingRelacionamento_=()=>({getSheetByName:()=>null}); back.rel_contatos_mapaCabecalhos_=()=>({});
executar(back,'RelGoogleContatosService.js');
const dados={tamanhoArquivo:fs.statSync('tests/fixtures/google-contacts-en.csv').size,registros:en};
const analise=back.rel_google_contatos_analisar_(dados);
assert.equal(analise.resumo.duplicidadesSimples,1); assert.equal(analise.resumo.conflitosIdentificacao,1); assert.equal(analise.resumo.ignoradosSemTelefone,1);
assert.deepStrictEqual(Array.from(analise.conflitos[0].nomes),['Silva, Maria','Outro nome']);
assert.equal(Object.keys(analise.porTelefone).length,3);
assert.throws(()=>back.rel_google_contatos_analisar_({tamanhoArquivo:1,registros:[]}),/não contém/);
assert.throws(()=>back.rel_google_contatos_analisar_({tamanhoArquivo:800000,registros:[{}]}),/750 KB/);
assert.throws(()=>back.rel_google_contatos_analisar_({tamanhoArquivo:100,registros:Array(5001).fill({})}),/5.000/);
assert.equal(back.rel_telefone_normalizar_('98988745298').telefoneNormalizado,back.rel_telefone_normalizar_('+55 98 98874-5298').telefoneNormalizado);

// Histórico completo, limpeza e compensação em caso de falha.
function contextoContato(opcoes={}) {
  const c=contexto(); c.REL_CONFIG={ENUMS:{ETAPA:['PARA_CONTATAR','NAO_CONTATAR','RETORNAR_DEPOIS'],MOTIVO_NAO_CONTATAR:['OUTRO','PARTICIPANTE_DESAFIO_GIRO']}};
  c.LockService={getScriptLock:()=>({waitLock(){c.lock=true},releaseLock(){c.unlock=true}})}; c.rel_garantirEstruturaContatos_=()=>({});
  const mapa={TELEFONE_NORMALIZADO:0,ETAPA:1,MOTIVO_NAO_CONTATAR:2,MOTIVO_NAO_CONTATAR_OUTRO:3,DATA_PROXIMO_RETORNO:4,DATA_ULTIMA_INTERACAO:5,ATUALIZADO_EM:6};
  c.registro={mapa,valores:['5598988745298','NAO_CONTATAR','OUTRO','Decisão antiga','retorno-antigo','interacao-antiga','atualizacao-antiga']};
  c.rel_contatos_localizar_=()=>c.registro; c.rel_contatos_atualizarCampos_=(_,campos)=>{c.campos=campos};
  c.rel_contatos_registrarHistoricoEtapa_=(_,antes,novo)=>{c.historico={antes,novo}; if(opcoes.falharHistorico) throw new Error('histórico indisponível')};
  c.rel_contatos_restaurarRegistro_=(_,valores)=>{c.restaurado=valores; if(opcoes.falharReversao) throw new Error('reversão indisponível')}; executar(c,'RelContatosService.js'); return c;
}
let contato=contextoContato(), resposta=contato.rel_contatos_atualizarEtapa_({telefoneNormalizado:'5598988745298',etapa:'PARA_CONTATAR',limparProximoRetorno:true});
assert.equal(resposta.status,'OK'); assert.equal(contato.campos.MOTIVO_NAO_CONTATAR,''); assert.equal(contato.campos.MOTIVO_NAO_CONTATAR_OUTRO,'');
assert.deepStrictEqual(JSON.parse(JSON.stringify(contato.historico.antes)),{etapa:'NAO_CONTATAR',motivoNaoContatar:'OUTRO',motivoNaoContatarOutro:'Decisão antiga'});
assert.deepStrictEqual(JSON.parse(JSON.stringify(contato.historico.novo)),{etapa:'PARA_CONTATAR',motivoNaoContatar:'',motivoNaoContatarOutro:''}); assert.equal(contato.unlock,true);
contato=contextoContato(); contato.registro.valores[1]='PARA_CONTATAR'; contato.registro.valores[2]=''; contato.registro.valores[3]='';
resposta=contato.rel_contatos_atualizarEtapa_({telefoneNormalizado:'5598988745298',etapa:'NAO_CONTATAR',motivoNaoContatar:'OUTRO',motivoNaoContatarOutro:'Justificativa nova'});
assert.equal(resposta.status,'OK'); assert.deepStrictEqual(JSON.parse(JSON.stringify(contato.historico.novo)),{etapa:'NAO_CONTATAR',motivoNaoContatar:'OUTRO',motivoNaoContatarOutro:'Justificativa nova'});
contato=contextoContato({falharHistorico:true}); resposta=contato.rel_contatos_atualizarEtapa_({telefoneNormalizado:'5598988745298',etapa:'PARA_CONTATAR',limparProximoRetorno:true});
assert.equal(resposta.status,'ERRO_ATUALIZACAO_REVERTIDA'); assert.deepStrictEqual(Array.from(contato.restaurado),Array.from(contato.registro.valores));
contato=contextoContato({falharHistorico:true,falharReversao:true}); resposta=contato.rel_contatos_atualizarEtapa_({telefoneNormalizado:'5598988745298',etapa:'PARA_CONTATAR',limparProximoRetorno:true});
assert.equal(resposta.status,'ERRO_CRITICO_INCONSISTENCIA'); assert.equal(contato.unlock,true);
contato=contextoContato(); assert.equal(contato.rel_contatos_atualizarEtapa_({telefoneNormalizado:'x',etapa:'NAO_CONTATAR'}).status,'ERRO_VALIDACAO');
assert.equal(contato.rel_contatos_atualizarEtapa_({telefoneNormalizado:'x',etapa:'NAO_CONTATAR',motivoNaoContatar:'OUTRO'}).status,'ERRO_VALIDACAO');
console.log('OK: histórico completo, limpeza, lock, reversão comum e falha crítica');

// Volume no limite e migração idempotente.
const volume=Array.from({length:5000},(_,i)=>({nome:'Pessoa '+i,telefones:['98'+String(900000000+i).padStart(9,'0')]}));
const volumeAnalise=back.rel_google_contatos_analisar_({tamanhoArquivo:700000,registros:volume});
assert.equal(volumeAnalise.resumo.contatosLidos,5000);
const migracao=contexto(); let headers=['TELEFONE_NORMALIZADO','ETAPA'];
const sheet={getLastColumn:()=>headers.length,getRange:(l,c,n,m)=>({getDisplayValues:()=>[headers.slice()],setValues:v=>{headers=headers.concat(v[0]);return {setFontWeight(){}}}}),getName:()=> 'Relacionamento_Contatos'};
migracao.REL_CONFIG={ABAS:{CONTATOS:{NOME:'Relacionamento_Contatos'}}}; migracao.dg_abrirPlanilhaMarketingRelacionamento_=()=>({getSheetByName:()=>sheet});
executar(migracao,'RelContatosRepo.js');
assert.equal(migracao.rel_garantirEstruturaContatos_().adicionados.length,2);
assert.equal(migracao.rel_garantirEstruturaContatos_().adicionados.length,0);
assert.equal(headers.filter(x=>x==='MOTIVO_NAO_CONTATAR').length,1);
console.log('OK: +4 assertions — volume de 5.000 e migração idempotente');

// Limpeza seletiva: remove apenas temporário expirado validado; preserva válido e genérico.
const limpeza=contexto(); limpeza.REL_CONFIG={ABAS:{GOOGLE_CONTATOS:{}}}; limpeza.dg_abrirPlanilhaMarketingRelacionamento_=()=>({getSheetByName:()=>null}); limpeza.rel_contatos_mapaCabecalhos_=()=>({});
const agora=Date.now(), arquivos=[
  {nome:'rel-google-contatos-temporario-expirado.json',conteudo:{modulo:'REL_GOOGLE_CONTATOS',token:'expirado',expiraEm:agora-1}},
  {nome:'rel-google-contatos-temporario-valido.json',conteudo:{modulo:'REL_GOOGLE_CONTATOS',token:'valido',expiraEm:agora+60000}},
  {nome:'rel-google-contatos-temporario-falso.json',conteudo:{modulo:'OUTRO',token:'falso',expiraEm:agora-1}},
  {nome:'arquivo-generico.json',conteudo:{modulo:'REL_GOOGLE_CONTATOS',token:'generico',expiraEm:agora-1}}
].map((x,i)=>({...x,id:String(i),lixo:false,getName(){return this.nome},getId(){return this.id},getBlob(){return {getDataAsString:()=>JSON.stringify(this.conteudo)}},setTrashed(v){this.lixo=v}}));
limpeza.DriveApp={searchFiles:()=>{const encontrados=arquivos.filter(a=>a.nome.includes('rel-google-contatos-temporario-'));let i=0;return{hasNext:()=>i<encontrados.length,next:()=>encontrados[i++]}}};
limpeza.PropertiesService={getScriptProperties:()=>({deleteProperty(){}})}; executar(limpeza,'RelGoogleContatosService.js');
assert.equal(limpeza.rel_google_contatos_limparTemporariosExpirados_().removidos,1); assert.equal(arquivos[0].lixo,true); assert.equal(arquivos[1].lixo,false); assert.equal(arquivos[2].lixo,false); assert.equal(arquivos[3].lixo,false);

// Controle real usado pelo modal, exercitado com elementos DOM mínimos.
(async () => {
  class Elemento {
    constructor(){this.listeners={};this.value='';this.hidden=false;this.open=false;this.textContent='';}
    addEventListener(tipo,fn){(this.listeners[tipo]||(this.listeners[tipo]=[])).push(fn)}
    emitir(tipo,dados={}){const ev={preventDefault(){this.defaultPrevented=true},clientX:50,clientY:50,...dados}; return Promise.all((this.listeners[tipo]||[]).map(fn=>fn(ev)))}
    showModal(){this.open=true} close(){this.open=false} reset(){this.motivo.value='';this.outro.value=''}
    getBoundingClientRect(){return{left:10,right:90,top:10,bottom:90}}
  }
  const modalCtx=contexto({window:{}}); executar(modalCtx,'RelContatosScripts.html'); const api=vm.runInContext('relContatos',modalCtx);
  function montar(salvar){const modal=new Elemento(),motivo=new Elemento(),outro=new Elemento(),form=new Elemento(),fechar=new Elemento(),cancelar=new Elemento();form.motivo=motivo;form.outro=outro;const els={modal,form,motivo,outro,outroWrap:new Elemento(),aviso:new Elemento(),fechar:[fechar,cancelar]};return{...els,fechar,cancelar,controle:api.criarControleNaoContatar(els,salvar)}}
  for (const acao of ['cancelar','fechar']) { const x=montar(async()=>true),select={value:'NAO_CONTATAR'};x.controle.abrir({select,anterior:'PARA_CONTATAR'});await x[acao].emitir('click');assert.equal(select.value,'PARA_CONTATAR'); }
  let x=montar(async()=>true),select={value:'NAO_CONTATAR'};x.controle.abrir({select,anterior:'PARA_CONTATAR'});await x.modal.emitir('cancel');assert.equal(select.value,'PARA_CONTATAR');
  x=montar(async()=>true);select={value:'NAO_CONTATAR'};x.controle.abrir({select,anterior:'PARA_CONTATAR'});await x.modal.emitir('click',{clientX:0,clientY:0});assert.equal(select.value,'PARA_CONTATAR');
  let chamadas=0;x=montar(async()=>{chamadas++;return true});select={value:'NAO_CONTATAR'};x.controle.abrir({select,anterior:'PARA_CONTATAR'});await x.form.emitir('submit');assert.equal(chamadas,0);assert.equal(x.aviso.hidden,false);
  x.motivo.value='OUTRO';await x.form.emitir('submit');assert.equal(chamadas,0);x.outro.value='Justificativa';await x.form.emitir('submit');assert.equal(chamadas,1);assert.equal(select.value,'NAO_CONTATAR');
  x=montar(async()=>{chamadas++;return false});select={value:'NAO_CONTATAR'};x.controle.abrir({select,anterior:'EM_CONVERSA'});x.motivo.value='PARTICIPANTE_DESAFIO_GIRO';await x.form.emitir('submit');assert.equal(select.value,'EM_CONVERSA');
  let resolver; chamadas=0;x=montar(()=>{chamadas++;return new Promise(r=>resolver=r)});select={value:'NAO_CONTATAR'};x.controle.abrir({select,anterior:'PARA_CONTATAR'});x.motivo.value='PARTICIPANTE_DESAFIO_GIRO';const a=x.form.emitir('submit'),b=x.form.emitir('submit');resolver(true);await Promise.all([a,b]);assert.equal(chamadas,1);
  console.log('OK: modal — cancelar, fechar, Esc, clique externo, validações, sucesso, falha e envio único');
})().catch(erro=>{console.error(erro);process.exitCode=1});

// Serialização efetiva de VALOR_ANTERIOR/VALOR_NOVO no repositório.
const hist=contexto(); hist.REL_CONFIG={ABAS:{HISTORICO:{CABECALHOS:['ID_EVENTO','TELEFONE_NORMALIZADO','TIPO_EVENTO','DATA_HORA','VALOR_ANTERIOR','VALOR_NOVO','DETALHE','USUARIO']}}}; hist.dg_abrirPlanilhaMarketingRelacionamento_=()=>({});
hist.Utilities={getUuid:()=> 'id'}; hist.Session={getActiveUser:()=>({getEmail:()=> 'usuario@example.com'})}; executar(hist,'RelContatosRepo.js');
let linhaHistorico; const hm=Object.fromEntries(hist.REL_CONFIG.ABAS.HISTORICO.CABECALHOS.map((x,i)=>[x,i]));
hist.rel_contatos_lerAba_=()=>({mapa:hm,aba:{getLastColumn:()=>8,getLastRow:()=>1,getRange:()=>({setValues:v=>{linhaHistorico=v[0]}})}});
hist.rel_contatos_registrarHistoricoEtapa_({mapa:{TELEFONE_NORMALIZADO:0},valores:['5598']},{etapa:'NAO_CONTATAR',motivoNaoContatar:'OUTRO',motivoNaoContatarOutro:'Antes'},{etapa:'PARA_CONTATAR',motivoNaoContatar:'',motivoNaoContatarOutro:''},new Date(0));
assert.deepStrictEqual(JSON.parse(linhaHistorico[hm.VALOR_ANTERIOR]),{etapa:'NAO_CONTATAR',motivoNaoContatar:'OUTRO',motivoNaoContatarOutro:'Antes'});
assert.deepStrictEqual(JSON.parse(linhaHistorico[hm.VALOR_NOVO]),{etapa:'PARA_CONTATAR',motivoNaoContatar:'',motivoNaoContatarOutro:''}); assert.equal(linhaHistorico[hm.USUARIO],'usuario@example.com');
console.log('OK: histórico serializado com valores anterior/novo completos e usuário');


// Identificação independe do nome; somente registros Google ATIVOS entram no índice.
const classif=contexto(); executar(classif,'RelContatosService.js');
const gm={TELEFONE_NORMALIZADO:0,NOME_GOOGLE:1,EMAIL:2,ATIVO:3};
const googleAtivoSemNome=classif.rel_contatos_indexarGoogleAtivos_([['5598000000000','','','ATIVO'],['5598111111111','','','INATIVO']],gm);
assert.equal(classif.rel_contatos_classificarIdentificacao_('',googleAtivoSemNome,'5598000000000'),'GOOGLE_CONTATOS');
assert.equal(classif.rel_contatos_classificarIdentificacao_('123',googleAtivoSemNome,'5598000000000'),'PARTICIPANTE_GIRO');
assert.equal(classif.rel_contatos_classificarIdentificacao_('',{},'5598000000000'),'NAO_IDENTIFICADO');
assert.equal(classif.rel_contatos_classificarIdentificacao_('',{},'5598111111111'),'NAO_IDENTIFICADO');
console.log('OK: contato Google ativo sem nome, prioridade DadosPessoais, inativo e ausente');
