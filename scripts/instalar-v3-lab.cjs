#!/usr/bin/env node
'use strict';
/**
 * Instala V3 em projeto Google Apps Script NOVO. Executa no computador
 * autenticado pelo proprietário; não usa tokens, senhas ou Apps Script PROD.
 * Cria projeto e faz push somente com confirmação explícita no comando.
 */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const sourceDir=path.join(root,'v3');
const files=['Config.gs','Importacao.gs','Index.html','Marketing.gs','Relacionamento.gs','appsscript.json'];
const oldIds=new Set([
 '1qOTRjWCldsxcu2cRa_nNzZPhoUHFO_NoEcCs0IQcItK7a87yR1tcTHYk',
 '1kGOdB_gSWesEqIlJNLWAOWF-zeMAfTH9TEjFXGJsqKKVs7CIYOJQ32S9'
]);
function refuse(message){throw Error('[LAB V3] '+message);}
function validate(){
 // Um repositório histórico pode possuir .clasp.json na raiz.
 // Nunca a usamos: create-script e push rodam exclusivamente no diretório
 // novo criado em build/, com um scriptId recém-gerado e validado.
 const actual=fs.readdirSync(sourceDir).filter(x=>/\.(gs|html|json)$/.test(x)).sort();
 if(JSON.stringify(actual)!==JSON.stringify(files.slice().sort()))
  refuse('Pacote inesperado: devem existir somente seis arquivos executáveis.');
 const manifest=JSON.parse(fs.readFileSync(path.join(sourceDir,'appsscript.json'),'utf8'));
 if(manifest.runtimeVersion!=='V8'||manifest.webapp?.access!=='MYSELF'||
   manifest.webapp?.executeAs!=='USER_DEPLOYING')
  refuse('Manifesto não exige execução proprietária e acesso somente eu.');
 const config=fs.readFileSync(path.join(sourceDir,'Config.gs'),'utf8');
 if(!config.includes('function v3_instalarLab()')||
  !config.includes('LAB deve usar apenas as duas planilhas fictícias autorizadas.'))
  refuse('Configuração automática e isolamento LAB não estão presentes.');
 return files;
}
function command(args,cwd){
 // Windows: chamar o wrapper real clasp.cmd por cmd.exe, sem shell:true
 // (evita DEP0190, perda de argumentos e problemas com caminhos com espaços).
 // Todos os argumentos são literais controlados por este instalador.
 for(const a of args)if(!/^[A-Za-z0-9_.-]+$/.test(a))
  refuse('Argumento inesperado no comando clasp: '+a);
 const win=process.platform==='win32';
 const bin=win?(process.env.ComSpec||'cmd.exe'):'clasp';
 const argv=win?['/d','/s','/c','clasp.cmd '+args.join(' ')]:args;
 const result=cp.spawnSync(bin,argv,{
  cwd,encoding:'utf8',shell:false,env:process.env,
  stdio:['inherit','pipe','pipe'],timeout:120000,windowsHide:true
 });
 return {status:result.status===null?1:result.status,
  error:result.error?.message||'',
  stdout:result.stdout||'',stderr:result.stderr||'',
  signal:result.signal||''};
}
function diagnosticoComando(nome,result,dir){
 const arquivos=fs.readdirSync(dir);
 console.log(nome+' → status '+result.status+'; arquivos locais: '+arquivos.join(', '));
 if(result.stdout.trim())console.log('Saída clasp: '+result.stdout.trim().slice(0,1600));
 if(result.stderr.trim())console.error('Erro clasp: '+result.stderr.trim().slice(0,1600));
 if(result.error)console.error('Erro de execução: '+result.error);
}
function vinculoSeCriado(result,dir){
 const arquivo=path.join(dir,'.clasp.json');
 if(fs.existsSync(arquivo))return arquivo;
 // Algumas instalações do clasp retornam o ID na URL mas não salvam a
 // configuração local. Recuperamos SOMENTE ID presente na saída da criação.
 const match=(result.stdout+'\n'+result.stderr)
  .match(/https:\/\/script\.google\.com\/(?:d\/|home\/projects\/)([A-Za-z0-9_-]{30,150})(?:\/edit)?/);
 if(!match)return null;
 const scriptId=match[1];
 if(oldIds.has(scriptId))refuse('Criação retornou ID conhecido de projeto anterior. Envio recusado.');
 fs.writeFileSync(arquivo,JSON.stringify({scriptId,rootDir:'.'},null,2)+'\n',{flag:'wx'});
 console.log('Vínculo local recuperado do ID retornado pelo Google.');
 return arquivo;
}
function install(){
 validate();
 const args=process.argv.slice(2);
 if(args.includes('--dry-run')){
  console.log('OK: pacote LAB V3 validado; 6 arquivos. Nenhum projeto criado ou enviado.');
  return;
 }
 if(!args.includes('--confirmar-novo-lab=SIM'))
  refuse('Execute com --confirmar-novo-lab=SIM para criar um NOVO Apps Script V3.');
 const base=path.join(root,'build');
 fs.mkdirSync(base,{recursive:true});
 const dir=fs.mkdtempSync(path.join(base,'v3-lab-novo-'));
 console.log('Projeto local isolado:',dir);
 // Consultar projetos existentes antes de criar outro com o mesmo título.
 let projetos=command(['list-scripts'],dir);
 if(projetos.status!==0 &&
   /unknown command|is not a command|invalid command/i.test(projetos.stderr+' '+projetos.stdout))
  projetos=command(['list'],dir);
 if(projetos.status!==0){
  diagnosticoComando('clasp list-scripts',projetos,dir);
  refuse('Não foi possível conferir projetos já criados. Nenhum novo projeto criado.');
 }
 const duplicados=projetos.stdout.split(/\r?\n/).filter(line=>
  line.includes('DG-Marketing-Relacionamento-V3-LAB'));
 if(duplicados.length){
  console.log('Projeto V3 LAB já aparece na conta Google:');
  duplicados.forEach(line=>console.log(line.trim().slice(0,280)));
  refuse('Projeto com este nome já existe. Envie a linha acima para recuperação sem duplicar.');
 }
 console.log('Criando novo Apps Script privado na conta autenticada pelo clasp.');
 // Criar projeto uma única vez. Fallback só quando a CLI NÃO reconhece
 // o comando; se criou o script mas não salvou o vínculo, jamais duplicar.
 let result=command(['create-script','--title','DG-Marketing-Relacionamento-V3-LAB','--type','standalone'],dir);
 diagnosticoComando('clasp create-script',result,dir);
 if(result.status!==0){
  if(vinculoSeCriado(result,dir))
   refuse('O Google retornou ID mas clasp apresentou erro. Revise a pasta; não criamos segundo projeto.');
  if(!/unknown command|unknown option|is not a command|invalid command/i.test(result.stderr+' '+result.stdout))
   refuse('Falha na criação. O erro completo foi mostrado acima. NADA foi enviado.');
  result=command(['create','--title','DG-Marketing-Relacionamento-V3-LAB','--type','standalone'],dir);
  diagnosticoComando('clasp create',result,dir);
  if(result.status!==0)
   refuse('Falha também na sintaxe antiga. NADA foi enviado.');
 }
 const claspFile=vinculoSeCriado(result,dir);
 if(!claspFile)refuse('O comando retornou sucesso, mas não forneceu ID nem .clasp.json. Confira a saída acima e o projeto em script.google.com/home. NADA foi enviado.');
 const cfg=JSON.parse(fs.readFileSync(claspFile,'utf8'));
 const id=cfg.scriptId||'';
 if(!/^[A-Za-z0-9_-]{30,150}$/.test(id)||oldIds.has(id))
  refuse('ID retornado é inválido ou pertence a projeto anterior; push bloqueado.');
 // Pasta recém-criada estava vazia antes do clasp. Remover templates locais
 // gerados por ele (por exemplo Code.js) para não publicar arquivos extras.
 for(const name of fs.readdirSync(dir)){
  if(name==='.clasp.json')continue;
  const dest=path.join(dir,name);
  if(!fs.statSync(dest).isFile())refuse('Subpasta inesperada na instalação V3: '+name);
  fs.unlinkSync(dest);
 }
 // Copiamos somente após criar/validar o ID; jamais enviamos código legado.
 for(const file of files)fs.copyFileSync(path.join(sourceDir,file),path.join(dir,file));
 // Rejeita arquivos criados pelo clasp que não façam parte do pacote.
 const present=fs.readdirSync(dir);
 const extra=present.filter(f=>!files.includes(f)&&f!=='.clasp.json');
 if(extra.length)refuse('Arquivos inesperados no projeto novo: '+extra.join(', '));
 console.log('ID do NOVO Apps Script:',id);
 console.log('Enviando 6 arquivos para o novo projeto isolado.');
 const pushed=command(['push'],dir);
 diagnosticoComando('clasp push',pushed,dir);
 if(pushed.status!==0)
  refuse('Clasp push não concluído. Projeto novo: '+id+'. Nenhum deploy realizado.');
 console.log('');
 console.log('LAB V3 criado e código enviado (nenhuma implantação Web realizada).');
 console.log('Editor: https://script.google.com/home/projects/'+id+'/edit');
 console.log('No editor, execute v3_instalarLab() para configurar as planilhas fictícias e validar as 11 condições.');
 console.log('Depois execute v3_lab_aceite() para conferir os 13 cenários de negócio.');
 console.log('Web App: Implantações > Nova implantação > App da Web > Eu > Somente eu.');
}
try{install();}catch(e){console.error(e.message||String(e));process.exitCode=1;}
