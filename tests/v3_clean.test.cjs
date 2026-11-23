'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),app=path.join(root,'v3');
const file=name=>fs.readFileSync(path.join(app,name),'utf8');
const ids={
  lm:'1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y',
  lp:'1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY',
  pm:'1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao',
  pp:'1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ'
};
const contHeader=['TELEFONE_NORMALIZADO','TELEFONE_EXIBICAO','ID_DGMB','NOME_PORTAL','NOME_CONTATO','CIDADE_UF_PORTAL',
 'CIDADE','UF','ETAPA','RESULTADO','VALIDADE','E_CICLISTA','MODALIDADE','DATA_PRIMEIRA_IMPORTACAO','DATA_ULTIMA_IMPORTACAO',
 'DATA_ANALISE','DATA_PRIMEIRA_MENSAGEM','DATA_ULTIMA_INTERACAO','DATA_PROXIMO_RETORNO','QUANTIDADE_TENTATIVAS',
 'EXPORTACAO_GOOGLE_STATUS','DATA_ULTIMA_EXPORTACAO','OBSERVACAO','ATUALIZADO_EM','NOME_GOOGLE_CONTATOS','SITUACAO'];
const makeRow=(h,record)=>h.map(k=>record[k]||'');
function fixtures(){
 const mark={
  Marketing:[
   ['REF','ID_DGMB','NOME_ORIGEM','TIPO','STATUS'],
   ['LAB_BIKE','','Canal Bike LAB','APOIADOR','ATIVO'],
   ['LAB_PASSOS','','Canal Passos LAB','APOIADOR','ATIVO']
  ],
  Relacionamento_Contatos:[contHeader,
   ...[
    {TELEFONE_NORMALIZADO:'5598991234501',TELEFONE_EXIBICAO:'(98) 99123-4501',ID_DGMB:'LAB01',NOME_PORTAL:'Pessoa Teste Bike',
      ETAPA:'PARA_CONTATAR',SITUACAO:'PODE_CONTATAR'},
    {TELEFONE_NORMALIZADO:'5598991234502',TELEFONE_EXIBICAO:'(98) 99123-4502',ID_DGMB:'LAB02',NOME_PORTAL:'Pessoa Teste Caminhada',
      ETAPA:'PARA_CONTATAR',SITUACAO:'PODE_CONTATAR'},
    {TELEFONE_NORMALIZADO:'5598991234503',TELEFONE_EXIBICAO:'(98) 99123-4503',ID_DGMB:'LAB03',NOME_PORTAL:'Pessoa Teste Ambas',
      ETAPA:'PARA_CONTATAR',SITUACAO:'PODE_CONTATAR'},
    {TELEFONE_NORMALIZADO:'5598991234504',TELEFONE_EXIBICAO:'(98) 99123-4504',ID_DGMB:'LAB04',NOME_PORTAL:'Pessoa Teste Nao Contatar',
      ETAPA:'NAO_CONTATAR',SITUACAO:'NAO_DESEJA_CONTATO'}
   ].map(x=>makeRow(contHeader,x))],
  Relacionamento_Origens:[['ID_ORIGEM','NOME_ORIGEM','TIPO_ORIGEM','STATUS','DATA_CADASTRO','OBSERVACAO'],
   ['O1','Equipe fictícia','LISTA_MANUAL','ATIVO','','']],
  Relacionamento_ContatoOrigens:[['TELEFONE_NORMALIZADO','ID_ORIGEM','DATA_PRIMEIRA_IDENTIFICACAO','DATA_ULTIMA_IDENTIFICACAO','QUANTIDADE_OCORRENCIAS'],
   ['5598991234501','O1','','',1]],
  Relacionamento_Historico:[['ID_EVENTO','TELEFONE_NORMALIZADO','TIPO_EVENTO','DATA_HORA','VALOR_ANTERIOR','VALOR_NOVO','DETALHE','USUARIO']],
 };
 const portal={
  DadosPessoais:[['ID_DGMB','whatsapp','nome'],
    ['LAB01','5598991234501','Pessoa Teste Bike'],['LAB02','5598991234502','Pessoa Teste Caminhada'],
    ['LAB03','5598991234503','Pessoa Teste Ambas'],['LAB04','5598991234504','Pessoa Teste Nao Contatar']],
  ListaDesafios:[['id_Desafio_lista','Nome_Desafio','Tipo','Periodo','Data_Inicio','Modalidade_Esportiva'],
    ['9001','Desafio teste ciclismo','Normal','dezembro/2026','2026-11-20','CICLISMO'],
    ['9002','Desafio teste caminhada','Normal','dezembro/2026','2026-12-01','CAMINHADA_CORRIDA'],
    ['9003','Desafio teste janeiro','Normal','janeiro/2027','2026-12-22','CICLISMO']],
  dgmbDesafios:[['Timestamp','ID_DGMB','Observacao','Modalidade_Esportiva','REF_MARKETING','Status_Usuario_Desafio','Status_Desafio'],
    ['2026-11-22','LAB01','[ID_DESAFIO:9001]','CICLISMO','LAB_BIKE','EM_ANDAMENTO','Ativo'],
    ['2026-12-11','LAB03','[ID_DESAFIO:9001]','CICLISMO','LAB_BIKE','EM_ANDAMENTO','Ativo'],
    ['2026-12-11','LAB02','[ID_DESAFIO:9002]','CAMINHADA_CORRIDA','LAB_PASSOS','EM_ANDAMENTO','Ativo'],
    ['2026-12-13','LAB03','[ID_DESAFIO:9002]','CAMINHADA_CORRIDA','','EM_ANDAMENTO','Ativo'],
    ['2026-12-21','LAB02','[ID_DESAFIO:9002]','','LAB_BIKE','CANCELADO','Ativo'],
    ['2026-12-22','LAB01','[ID_DESAFIO:9003]','','NAO_CADASTRADA','EM_ANDAMENTO','Ativo']
  ]
 };
 return {mark,portal};
}
function context(env='LAB',edit='',f=fixtures()){
 const props={
  DG_AMBIENTE:env,DG_MARKETING_SPREADSHEET_ID:env==='LAB'?ids.lm:ids.pm,
  DG_PORTAL_SPREADSHEET_ID:env==='LAB'?ids.lp:ids.pp,
  DG_PROD_EDICAO_LIBERADA:edit,METAS_MARKETING_V2:'{}'
 };
 let updates=0,uuid=0;
 function book(id,sets){
  return {getId:()=>id,getSheetByName(name){
   const values=sets[name];if(!values)return null;
   return {getDataRange(){return {getDisplayValues(){return values}};},
     getRange(row,col){
      return {
       setValue(value){updates++;values[row-1][col-1]=String(value);return this;},
       setValues(matrix){updates++;matrix.forEach((r,i)=>{values[row-1+i]=r.map(v=>String(v));});return this;}
      };
     },
     appendRow(row){updates++;values.push(row.map(v=>String(v)));},
     getLastRow(){return values.length;}
   };
  }};
 }
 const ctx=vm.createContext({
  PropertiesService:{getScriptProperties(){return {
   getProperty(k){return props[k]||'';},setProperty(k,v){props[k]=v;updates++;}
  }}},
  SpreadsheetApp:{openById(id){
   if(id===ids.lm||id===ids.pm)return book(id,f.mark);
   if(id===ids.lp||id===ids.pp)return book(id,f.portal);
   throw Error('unexpected spreadsheet id');
  }},
  LockService:{getScriptLock(){return {waitLock(){},releaseLock(){}};}},
  Utilities:{getUuid(){return 'test-uuid-'+(++uuid)},formatDate(){return '2026-12-12'}},
  Session:{getEffectiveUser(){return {getEmail(){return 'lab@example.test'}}},
   getScriptTimeZone(){return 'America/Fortaleza';}}
 });
 for(const name of ['Config.gs','Marketing.gs','Relacionamento.gs','Importacao.gs']){
  vm.runInContext(file(name),ctx,{filename:name});
 }
 return {ctx,props,fixtures:f,get updates(){return updates}};
}
test('LAB usa só duas planilhas fictícias autorizadas',()=>{
 const c=context();assert.equal(c.ctx.v3_config_().ambiente,'LAB');
 assert.equal(c.ctx.v3_config_().edicao,true);
 c.props.DG_MARKETING_SPREADSHEET_ID=ids.pm;
 assert.throws(()=>c.ctx.v3_config_(),/LAB deve usar/);
});
test('PROD começa bloqueado para qualquer mudança',()=>{
 const c=context('PROD');assert.equal(c.ctx.v3_config_().edicao,false);
 assert.throws(()=>c.ctx.v3_salvarMetas({periodo:'dezembro/2026',geral:100,desafios:{}}),/somente leitura/);
 assert.throws(()=>c.ctx.v3_salvarContato({telefone:'5598991234501',situacao:'PODE_CONTATAR'}),/somente leitura/);
 assert.throws(()=>c.ctx.v3_registrarDivulgador({nome:'X',tipo:'OUTRO'}),/somente leitura/);
 assert.equal(c.updates,0);
});
test('Marketing conta pela competência e exclui canceladas, sem inventar REF',()=>{
 const c=context(),d=c.ctx.v3_painel('dezembro/2026','').dados;
 assert.equal(d.total,4);assert.equal(d.atribuido,3);
 assert.equal(d.direto,1);assert.equal(d.naoCadastrada,0);
 assert.equal(d.desafios.length,2);
 assert.equal(c.ctx.v3_painel('dezembro/2026','9001').dados.total,2);
 assert.equal(c.ctx.v3_painel('dezembro/2026','9002').dados.total,2);
 assert.equal(c.ctx.v3_painel('dezembro/2026','9003').dados.total,0);
 assert.equal(c.ctx.v3_painel('dezembro/2026','9003').dados.invalido,true);
 const jan=c.ctx.v3_painel('janeiro/2027','').dados;
 assert.equal(jan.total,1);assert.equal(jan.naoCadastrada,1);
 assert.equal(c.updates,0);
});
test('Metas são isoladas por mês, zero é válido e desafio errado falha',()=>{
 const c=context();
 let a=c.ctx.v3_salvarMetas({periodo:'dezembro/2026',geral:0,desafios:{9001:50,9002:30}});
 assert.equal(a.status,'OK');assert.equal(c.ctx.v3_painel('dezembro/2026','').dados.meta,0);
 assert.equal(c.ctx.v3_painel('dezembro/2026','9001').dados.meta,50);
 assert.equal(c.ctx.v3_painel('janeiro/2027','').dados.meta,200);
 assert.throws(()=>c.ctx.v3_salvarMetas({periodo:'dezembro/2026',geral:10,desafios:{9003:8}}),/não pertence/);
});
test('Referências podem ser cadastradas sem gravar no Portal',()=>{
 const c=context(),n=c.fixtures.mark.Marketing.length;
 const r=c.ctx.v3_registrarDivulgador({nome:'Equipe Teste',tipo:'APOIADOR'});
 assert.equal(r.status,'OK');assert.equal(c.fixtures.mark.Marketing.length,n+1);
 assert.match(r.dados.ref,/^\d+$/);
 assert.throws(()=>c.ctx.v3_registrarDivulgador({ref:'=HYPERLINK',nome:'Evil',tipo:'OUTRO'}),/REF inválida/);
 const status=c.ctx.v3_alterarDivulgador('LAB_BIKE','INATIVO');
 assert.equal(status.status,'OK');
 assert.equal(c.fixtures.mark.Marketing[1][4],'INATIVO');
});
test('Relacionamento filtra esportes, permite ambos e preserva não contatar',()=>{
 const c=context(),all=c.ctx.v3_contatos({etapa:'TODOS'}).dados;
 assert.equal(all.total,4);
 assert.equal(all.indicadores.PARA_CONTATAR,3);
 assert.equal(all.indicadores.NAO_CONTATAR,1);
 assert.equal(c.ctx.v3_contatos({}).dados.total,3);
 const bike=c.ctx.v3_contatos({etapa:'TODOS',esporte:'CICLISMO'}).dados.registros;
 assert.equal(bike.length,2);
 assert.ok(bike.some(x=>x.nome==='Pessoa Teste Ambas'&&x.perfil==='AMBOS'));
 const run=c.ctx.v3_contatos({etapa:'TODOS',esporte:'CAMINHADA_CORRIDA'}).dados.registros;
 assert.equal(run.length,2);
 assert.equal(c.ctx.v3_contatos({etapa:'TODOS',busca:'4502'}).dados.total,1);
});
test('Edição de contato gera histórico sem alterar planilha do Portal',()=>{
 const c=context(),b=c.fixtures.portal.dgmbDesafios.length;
 c.ctx.v3_salvarContato({telefone:'5598991234501',etapa:'RETORNAR_DEPOIS',retorno:'2026-12-27',
  situacao:'PODE_CONTATAR',observacao:'Contatar após o evento'});
 assert.equal(c.fixtures.mark.Relacionamento_Contatos[1][8],'RETORNAR_DEPOIS');
 assert.equal(c.fixtures.mark.Relacionamento_Contatos[1][18],'2026-12-27');
 assert.ok(c.fixtures.mark.Relacionamento_Historico.length>=2);
 assert.equal(c.fixtures.portal.dgmbDesafios.length,b);
 assert.throws(()=>c.ctx.v3_salvarContato({telefone:'5598991234501',etapa:'RETORNAR_DEPOIS'}),/data/);
});
test('Atribuição da REF é numérica ou alfanumérica e sem fórmula',()=>{
 const c=context();
 assert.equal(c.ctx.v3_ref_('LAB_123'),'LAB_123');
 assert.equal(c.ctx.v3_ref_('1145'),'1145');
 assert.equal(c.ctx.v3_ref_('=IMPORTXML("x")'),'');
 assert.equal(c.ctx.v3_ref_('__proto__'),'__proto__');
});
test('Pacote v3 é limpo e não possui serviços antigos ou projeto anterior',()=>{
 const script=path.join(root,'scripts/preparar-v3-limpa.cjs');
 const run=args=>cp.spawnSync(process.execPath,[script,...args],{cwd:root,encoding:'utf8'});
 const dry=run(['--dry-run']);
 assert.equal(dry.status,0,dry.stderr);assert.match(dry.stdout,/6 arquivos/);
 const old=run(['--script-id=1qOTRjWCldsxcu2cRa_nNzZPhoUHFO_NoEcCs0IQcItK7a87yR1tcTHYk',
  '--confirm-new-project=SIM']);
 assert.notEqual(old.status,0);assert.match(old.stderr,/bloqueado/);
 const id='1V3_NOVO_'+'X'.repeat(32);
 const build=run(['--script-id='+id,'--confirm-new-project=SIM']);
 assert.equal(build.status,0,build.stderr);
 const m=build.stdout.match(/PACOTE LIMPO V3: ([^\r\n]+)/);
 assert.ok(m);
 const dir=path.resolve(m[1]);
 try {
  assert.ok(fs.existsSync(path.join(dir,'.clasp.json')));
  const files=fs.readdirSync(dir).sort();
  assert.deepEqual(files,['.clasp.json','Config.gs','Importacao.gs','Index.html','Marketing.gs','Relacionamento.gs','appsscript.json']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'.clasp.json'),'utf8')).scriptId,id);
  assert.ok(!files.includes('MigracaoBaseMarketingRelacionamento.js'));
 }finally{
  if(path.dirname(dir)===path.join(root,'build')&&path.basename(dir).startsWith('v3-clean-'))
   fs.rmSync(dir,{force:true,recursive:true});
 }
});

test('CSV/contatos: pré-análise não grava, duplica nem substitui a agenda',()=>{
 const c=context();const before=c.updates;
 const dados={registros:[
  {nome:'João Novo',telefone:'98991234577',cidade:'Cidade Fictícia',uf:'MA'},
  {nome:'Outra Pessoa',telefone:'5598991234501',cidade:'',uf:'MA'},
  {nome:'Duplicado no lote',telefone:'5598991234577',cidade:'',uf:'MA'},
  {nome:'Invalido',telefone:'123'}
 ]};
 const preview=c.ctx.v3_analisarImportacao(dados).dados;
 assert.equal(preview.total,4);
 assert.equal(preview.novos,1);
 assert.equal(preview.repetidos,2);
 assert.equal(preview.invalidos,1);
 assert.equal(c.updates,before,'A prévia nunca grava dados');
 assert.throws(()=>c.ctx.v3_confirmarImportacao(dados),/Corrija/);
 const fix={registros:dados.registros.slice(0,3),origemId:'O1'};
 const done=c.ctx.v3_confirmarImportacao(fix).dados;
 assert.equal(done.gravados,1);
 assert.equal(done.repetidos,2);
 assert.ok(c.fixtures.mark.Relacionamento_Contatos.some(x=>x[0]==='5598991234577'));
 assert.equal(c.fixtures.mark.Relacionamento_ContatoOrigens.length,3);
 assert.ok(c.updates>before);
 const back=c.ctx.v3_contatos({etapa:'TODOS',busca:'91234577'}).dados;
 assert.equal(back.total,1);
});
test('Importação e vínculo são bloqueados por padrão em produção',()=>{
 const c=context('PROD');
 assert.throws(()=>c.ctx.v3_confirmarImportacao({registros:[]}),/somente leitura/);
 assert.throws(()=>c.ctx.v3_vincularOrigem({telefone:'5598991234501',origemId:'O1'}),/somente leitura/);
 const p=c.ctx.v3_analisarImportacao({registros:[{nome:'Novo',telefone:'98991234587'}]}).dados;
 assert.equal(p.novos,1);
 assert.equal(c.updates,0);
});
test('Vínculo com origem evita duplicação e o histórico é consultável',()=>{
 const c=context();
 const old=c.ctx.v3_vincularOrigem({telefone:'5598991234501',origemId:'O1'});
 assert.match(old.mensagem,/já vinculada/);
 c.ctx.v3_salvarContato({telefone:'5598991234501',etapa:'EM_CONVERSA'});
 const r=c.ctx.v3_historicoContato('5598991234501');
 assert.equal(r.status,'OK');
 assert.ok(r.dados.eventos.some(x=>x.tipo==='ETAPA'));
});
test('HTML de dois módulos não inclui serviço legado ou envio automático',()=>{
 const source=file('Index.html');
 for(const x of ['Marketing','Relacionamento','v3_analisarImportacao','v3_confirmarImportacao',
  'v3_historicoContato','v3_vincularOrigem','v3_painel','v3_contatos']){
  assert.ok(source.includes(x),x);
 }
 assert.match(source,/state\.opt\.ambiente==='LAB'/);
 assert.doesNotMatch(source,/messages\.send|\.sendMessage\(/i);
 const script=source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new vm.Script(script.replace(/<\?=[^>]+?\?>/g,"LAB")));
});

test('Telefone local DDD 55 recebe DDI e não é confundido com código de país',()=>{
 const c=context();
 assert.equal(c.ctx.v3_fone_('55 9 9123-4567'),'5555991234567');
 assert.equal(c.ctx.v3_fone_('+55 55 99123-4567'),'5555991234567');
 assert.equal(c.ctx.v3_fone_('98 99123-4501'),'5598991234501');
});
test('Ciclista confirmado manualmente pode ser reconhecido sem inscrição histórica',()=>{
 const c=context(),idx=c.ctx.v3_indiceEsportivo_(c.ctx.v3_bases_().portal);
 assert.equal(c.ctx.v3_classificarContato_({ID_DGMB:'SEM_INSCRICAO',
  TELEFONE_NORMALIZADO:'5598888888888',MODALIDADE:'NAO_INFORMADO',
  E_CICLISTA:'SIM'},idx),'CICLISMO');
 assert.equal(c.ctx.v3_classificarContato_({ID_DGMB:'SEM_INSCRICAO',
  TELEFONE_NORMALIZADO:'5598888888888',MODALIDADE:'NAO_INFORMADO',
  E_CICLISTA:'NAO_CONFIRMADO'},idx),'NAO_IDENTIFICADO');
});
test('Nomes iniciados por fórmula são gravados como texto em planilha, nunca interpretados',()=>{
 const c=context();
 c.ctx.v3_confirmarImportacao({registros:[{telefone:'98991234688',nome:'=IMPORTXML("https://x","/")',cidade:'Cidade Teste',uf:'MA'}]});
 const row=c.fixtures.mark.Relacionamento_Contatos.at(-1);
 assert.match(row[4],/^'=IMPORTXML/);
 assert.equal(c.ctx.v3_ref_('+1'),'');
});
