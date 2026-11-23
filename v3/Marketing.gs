/**
 * Marketing V3: desempenho por mês de realização do desafio.
 * REF conhecida, sem REF e REF não cadastrada são três origens distintas.
 * Não atribuir retrospectivamente inscrições antigas.
 */
function v3_metas_(periodo){
 const raw=PropertiesService.getScriptProperties().getProperty('METAS_MARKETING_V2');
 let all={};try{all=JSON.parse(raw||'{}')||{};}catch(e){all={};}
 const m=all[periodo]||{};
 return {geral:Object.prototype.hasOwnProperty.call(m,'geral')?Number(m.geral||0):200,
   desafios:m.desafios||{}};
}
function v3_painel(periodoSolicitado,desafioSolicitado){
 const base=v3_bases_(),cat=v3_catalogo_(base.portal);
 const periodo=v3_texto_(periodoSolicitado)||cat.periodos[0]||'';
 const escolhido=v3_texto_(desafioSolicitado);
 const periodoValido=cat.periodos.indexOf(periodo)>=0;
 const desafioValido=!escolhido||(cat.porId[escolhido]&&cat.porId[escolhido].periodo===periodo);
 const invalido=!periodoValido||!desafioValido;
 const metas=v3_metas_(periodo);
 const desafioPeriodo=cat.items.filter(c=>c.periodo===periodo);
 const refs=v3_tabela_(base.marketing,'Marketing',['REF','NOME_ORIGEM','STATUS','TIPO']).records;
 const origens=Object.create(null);
 for(const r of refs){
   const ref=v3_ref_(r.REF);if(!ref||origens[ref])continue;
   origens[ref]={ref:ref,nome:r.NOME_ORIGEM||ref,tipo:r.TIPO,status:r.STATUS,inscricoes:0};
 }
 const resultados=Object.create(null);
 for(const d of desafioPeriodo){
   resultados[d.id]={id:d.id,nome:d.nome,tipo:d.tipo,periodo:d.periodo,
     meta:Number(metas.desafios[d.id]||0),total:0,atribuido:0,direto:0,naoCadastrada:0};
 }
 const rows=v3_tabela_(base.portal,'dgmbDesafios',
   ['ID_DGMB','Observacao','Status_Usuario_Desafio','Status_Desafio','REF_MARKETING']).records;
 const resumo={total:0,atribuido:0,direto:0,naoCadastrada:0};
 if(!invalido){
  for(const r of rows){
   if(!v3_elegivel_(r))continue;
   const id=v3_idDesafio_(r),d=cat.porId[id];
   if(!d||d.periodo!==periodo||(escolhido&&id!==escolhido))continue;
   const ref=v3_texto_(r.REF_MARKETING);
   const origem=ref?origens[ref]:null;
   const tipo=!ref?'direto':origem?'atribuido':'naoCadastrada';
   resumo.total++;resumo[tipo]++;
   resultados[id].total++;resultados[id][tipo]++;
   if(origem)origem.inscricoes++;
  }
 }
 const meta=escolhido?Number(metas.desafios[escolhido]||0):metas.geral;
 return v3_resposta_('OK',{
  periodo:periodo,desafio:escolhido,invalido:invalido,periodos:cat.periodos,
  desafios:desafioPeriodo.map(d=>resultados[d.id]),
  meta:meta,metaGeral:metas.geral,
  percentual:meta>0?Math.round(1000*resumo.total/meta)/10:0,
  total:resumo.total,atribuido:resumo.atribuido,direto:resumo.direto,
  naoCadastrada:resumo.naoCadastrada,
  divulgadores:Object.values(origens).sort((a,b)=>b.inscricoes-a.inscricoes||a.nome.localeCompare(b.nome,'pt-BR'))
 });
}
function v3_metasPeriodo(periodo){
 const cat=v3_catalogo_(v3_bases_().portal),p=v3_texto_(periodo);
 const items=cat.items.filter(d=>d.periodo===p),m=v3_metas_(p);
 if(!items.length)return v3_resposta_('ERRO',{},'Nenhum desafio cadastrado nesse mês.');
 return v3_resposta_('OK',{periodo:p,geral:m.geral,
  desafios:items.map(d=>({id:d.id,nome:d.nome,meta:Number(m.desafios[d.id]||0)}))});
}
function v3_salvarMetas(entrada){
 v3_escrita_();
 return v3_lock_(()=>{
  const periodo=v3_texto_(entrada&&entrada.periodo);
  const cat=v3_catalogo_(v3_bases_().portal);
  const ids=new Set(cat.items.filter(d=>d.periodo===periodo).map(d=>d.id));
  if(!ids.size)throw Error('Período sem desafios cadastrados.');
  const geral=Number(entrada.geral);
  if(!Number.isSafeInteger(geral)||geral<0)throw Error('Meta geral inválida.');
  const m=entrada.desafios||{};
  if(!m||typeof m!=='object'||Array.isArray(m))throw Error('Metas inválidas.');
  const out=Object.create(null);
  for(const id of Object.keys(m)){
   if(!ids.has(id))throw Error('Uma meta não pertence ao mês selecionado.');
   const n=Number(m[id]);
   if(!Number.isSafeInteger(n)||n<0)throw Error('Meta de desafio inválida.');
   if(n>0)out[id]=n;
  }
  const props=PropertiesService.getScriptProperties();
  let all={};try{all=JSON.parse(props.getProperty('METAS_MARKETING_V2')||'{}')||{};}catch(e){}
  all[periodo]={geral:geral,desafios:out};
  props.setProperty('METAS_MARKETING_V2',JSON.stringify(all));
  return v3_resposta_('OK',{periodo:periodo},'Metas salvas.');
 });
}
function v3_registrarDivulgador(entrada){
 v3_escrita_();
 return v3_lock_(()=>{
   const b=v3_bases_(),tab=v3_tabela_(b.marketing,'Marketing',
     ['REF','ID_DGMB','NOME_ORIGEM','TIPO','STATUS']);
   const nome=v3_texto_(entrada&&entrada.nome);
   const tipo=v3_texto_(entrada&&entrada.tipo).toUpperCase()||'OUTRO';
   const id=v3_texto_(entrada&&entrada.idDgmb);
   if(!nome||nome.length>100||!/^[A-Z0-9_-]{1,40}$/.test(tipo))
      throw Error('Informe nome e tipo válidos.');
   if(id&&(!/^[A-Za-z0-9_-]{1,100}$/.test(id)))throw Error('ID DGMB inválido.');
   let ref=v3_texto_(entrada&&entrada.ref);
   if(!ref){
     const numeros=tab.records.map(r=>/^\d+$/.test(r.REF)?Number(r.REF):0).filter(Number.isSafeInteger);
     ref=String(Math.max(1000,...numeros)+1);
   }
   ref=v3_ref_(ref);
   if(!ref)throw Error('REF inválida: use letras, números, _ ou -.');
   if(tab.records.some(r=>r.REF===ref))throw Error('REF já cadastrada.');
   const h=tab.header;
   const row=new Array(h.length).fill('');
   const valores={REF:ref,ID_DGMB:id,NOME_ORIGEM:v3_seguroCelula_(nome),TIPO:tipo,STATUS:'ATIVO'};
   Object.keys(valores).forEach(k=>{row[h.indexOf(k)]=valores[k];});
   tab.sheet.appendRow(row);
   return v3_resposta_('OK',{ref:ref},'Divulgador cadastrado.');
 });
}
function v3_alterarDivulgador(ref,status){
 v3_escrita_();
 return v3_lock_(()=>{
   const r=v3_ref_(ref),s=v3_texto_(status).toUpperCase();
   if(!r||!['ATIVO','INATIVO'].includes(s))throw Error('Dados inválidos.');
   const tab=v3_tabela_(v3_bases_().marketing,'Marketing',['REF','STATUS']);
   const row=tab.records.find(x=>x.REF===r);
   if(!row)throw Error('REF não encontrada.');
   v3_gravarCampos_(tab,row,{STATUS:s});
   return v3_resposta_('OK',{ref:r,status:s},'Status atualizado.');
 });
}
