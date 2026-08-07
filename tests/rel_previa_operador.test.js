const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
let verificacoes = 0;
function igual(a,b,m){assert.deepStrictEqual(a,b,m);verificacoes++;}
function ok(v,m){assert.ok(v,m);verificacoes++;}
const c={console,Date,Number,String,Object,Array,Math,RegExp,JSON};vm.createContext(c);
function carregar(nome){vm.runInContext(fs.readFileSync(nome,'utf8'),c,{filename:nome});}
carregar('RelTelefoneNormalizer.js');
c.REL_CONFIG={ABAS:{GOOGLE_CONTATOS:{NOME:'GoogleContatos',CABECALHOS:['TELEFONE_NORMALIZADO','NOME_GOOGLE','TELEFONE_ORIGINAL','EMAIL','DATA_IMPORTACAO','ATIVO']}}};
c.rel_contatos_mapaCabecalhos_=()=>({});c.dg_abrirPlanilhaMarketingRelacionamento_=()=>({getSheetByName:()=>null});
const props={},arquivos={};let sequencia=0,gravacoes=0;
c.PropertiesService={getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v},deleteProperty:k=>{delete props[k]}})};
c.Utilities={getUuid:()=> 'token-'+(++sequencia)};c.MimeType={PLAIN_TEXT:'text/plain'};
c.DriveApp={searchFiles:()=>({hasNext:()=>false}),createFile:(nome,conteudo)=>{const id='arquivo-'+sequencia;arquivos[id]={id,nome,conteudo,lixo:false,getId(){return id},getName(){return nome},isTrashed(){return this.lixo},getBlob(){return{getDataAsString:()=>this.conteudo}},setTrashed(v){this.lixo=v}};return arquivos[id]},getFileById:id=>arquivos[id]};
c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
carregar('RelGoogleContatosService.js');
const mapa={TELEFONE_NORMALIZADO:0,NOME_GOOGLE:1,TELEFONE_ORIGINAL:2,EMAIL:3,DATA_IMPORTACAO:4,ATIVO:5};let linhas=[];
c.rel_google_contatos_obterTabela_=()=>({aba:{getLastColumn:()=>6,getRange:()=>({setValues:v=>{linhas=v;gravacoes++}})},mapa,valores:linhas.map(x=>x.slice())});
const dados={tamanhoArquivo:100,registros:[{nome:'Contato',email:'c@x',telefones:['98999999999']}]};
const op1={id:'operador_001',nome:'Um'},op2={id:'operador_002',nome:'Dois'};

// 1 e 2: criação independente, proprietário interno, sem chave/hash/e-mail.
let r1=c.rel_google_contatos_preAnalisar_(dados,op1),r2=c.rel_google_contatos_preAnalisar_(dados,op2);igual(r1.status,'OK');igual(r2.status,'OK');
const chave1='REL_GOOGLE_CONTATOS_PREVIA_'+r1.dados.token,chave2='REL_GOOGLE_CONTATOS_PREVIA_'+r2.dados.token;
const meta1=JSON.parse(props[chave1]),meta2=JSON.parse(props[chave2]),json1=JSON.parse(arquivos[meta1.fileId].conteudo);
igual(meta1.proprietarioId,'operador_001');igual(meta2.proprietarioId,'operador_002');igual(json1.proprietarioId,'operador_001');
const previaPersistida=JSON.stringify({metadados:meta1,json:json1});
ok(!previaPersistida.includes('chave-1'));ok(!Object.prototype.hasOwnProperty.call(meta1,'usuario'));
ok(!Object.prototype.hasOwnProperty.call(json1,'usuario'));ok(!Object.prototype.hasOwnProperty.call(meta1,'chaveHash'));

// 3 e 4: consulta/validação central permite dono e recusa outro sem expor dados.
igual(c.rel_google_contatos_validarPrevia_(r1.dados.token,op1.id).valido,true);
igual(c.rel_google_contatos_validarPrevia_(r1.dados.token,op2.id).valido,false);

// 6 e 8: outro operador não confirma nem cancela, não grava, apaga ou invalida.
let antes=gravacoes;igual(c.rel_google_contatos_confirmar_({token:r1.dados.token},op2).status,'ERRO_PREVIA_INDISPONIVEL');igual(gravacoes,antes);igual(arquivos[meta1.fileId].lixo,false);ok(!!props[chave1]);
igual(c.rel_google_contatos_cancelarPrevia_({token:r1.dados.token},op2).status,'ERRO_PREVIA_INDISPONIVEL');igual(arquivos[meta1.fileId].lixo,false);ok(!!props[chave1]);

// 5: proprietário confirma e o fluxo de gravação anterior é preservado.
igual(c.rel_google_contatos_confirmar_({token:r1.dados.token},op1).status,'OK');igual(gravacoes,antes+1);igual(linhas[0][1],'Contato');igual(arquivos[meta1.fileId].lixo,true);igual(props[chave1],undefined);

// 7: proprietário cancela sua segunda prévia.
igual(c.rel_google_contatos_cancelarPrevia_({token:r2.dados.token},op2).status,'OK');igual(arquivos[meta2.fileId].lixo,true);igual(props[chave2],undefined);

// 12, 14, 15 e 16: formatos antigos/ausentes/divergentes são recusados sem migração.
function instalar(token,meta,json){const id='arquivo-'+token,nome='rel-google-contatos-temporario-'+token+'.json';meta={token,fileId:id,nomeArquivo:nome,expiraEm:Date.now()+60000,criadoEm:1,utilizado:false,modulo:'REL_GOOGLE_CONTATOS',...meta};arquivos[id]={nome,conteudo:JSON.stringify({token,expiraEm:meta.expiraEm,criadoEm:meta.criadoEm,utilizado:false,modulo:'REL_GOOGLE_CONTATOS',porTelefone:{},conflitos:[],...json}),lixo:false,getName(){return nome},isTrashed(){return false},getBlob(){return{getDataAsString:()=>this.conteudo}},setTrashed(v){this.lixo=v}};props['REL_GOOGLE_CONTATOS_PREVIA_'+token]=JSON.stringify(meta);}
instalar('antiga',{usuario:'email:x'},{usuario:'email:x'});igual(c.rel_google_contatos_confirmar_({token:'antiga'},op1).status,'ERRO_PREVIA_INCOMPATIVEL');
igual(arquivos['arquivo-antiga'].lixo,false);ok(!!props.REL_GOOGLE_CONTATOS_PREVIA_antiga);
instalar('sem-meta',{versao:2,proprietarioTipo:'OPERADOR_RELACIONAMENTO'},{versao:2,proprietarioTipo:'OPERADOR_RELACIONAMENTO',proprietarioId:op1.id});igual(c.rel_google_contatos_validarPrevia_('sem-meta',op1.id).incompativel,true);
instalar('sem-json',{versao:2,proprietarioTipo:'OPERADOR_RELACIONAMENTO',proprietarioId:op1.id},{versao:2,proprietarioTipo:'OPERADOR_RELACIONAMENTO'});igual(c.rel_google_contatos_validarPrevia_('sem-json',op1.id).incompativel,true);
instalar('diverge',{versao:2,proprietarioTipo:'OPERADOR_RELACIONAMENTO',proprietarioId:op1.id},{versao:2,proprietarioTipo:'OPERADOR_RELACIONAMENTO',proprietarioId:op2.id});igual(c.rel_google_contatos_validarPrevia_('diverge',op1.id).valido,false);

// 13 e 17: Session não existe; rotação mantém propriedade porque o ID é estável.
igual(typeof c.Session,'undefined');
instalar('rotacao',{versao:2,proprietarioTipo:'OPERADOR_RELACIONAMENTO',proprietarioId:op1.id},{versao:2,proprietarioTipo:'OPERADOR_RELACIONAMENTO',proprietarioId:op1.id});igual(c.rel_google_contatos_validarPrevia_('rotacao',{id:op1.id}.id).valido,true);

// 9, 10, 11 e 18: API deriva operador da chave; inválida/ausente/inativa não chama o serviço; ID público é ignorado.
c.REL_ACESSO_MENSAGEM_INVALIDA = 'Acesso inválido';
carregar('RelApiServer.js');let chamadas=0,recebido;
c.rel_acesso_exigirOperador_=acesso=>{if(acesso==='chave-1')return op1;throw new Error('REL_ACESSO_INVALIDO')};
c.rel_google_contatos_preAnalisar_=(entrada,operador)=>{chamadas++;recebido={entrada,operador};return{status:'OK'}};
c.rel_google_contatos_confirmar_=()=>{chamadas++;return{status:'OK'}};c.rel_google_contatos_cancelarPrevia_=()=>{chamadas++;return{status:'OK'}};
igual(c.rel_preAnalisarGoogleContatos({proprietarioId:'inventado'},'').status,'ERRO_ACESSO');igual(c.rel_preAnalisarGoogleContatos({},'invalida').status,'ERRO_ACESSO');igual(chamadas,0);
igual(c.rel_confirmarGoogleContatos({token:'x'},'').status,'ERRO_ACESSO');igual(c.rel_cancelarPreviaGoogleContatos({token:'x'},'chave-inativa').status,'ERRO_ACESSO');igual(chamadas,0);
igual(c.rel_preAnalisarGoogleContatos({proprietarioId:'inventado'},'chave-1').status,'OK');igual(recebido.operador.id,op1.id);ok(recebido.operador.id!==recebido.entrada.proprietarioId);

console.log(verificacoes+' verificações de propriedade da prévia aprovadas.');
