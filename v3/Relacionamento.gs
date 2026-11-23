/**
 * Relacionamento V3: contatos operacionais e histórico na base independente.
 * Esporte vem da modalidade declarada, do Portal ou do catálogo do desafio.
 * Nenhuma dedução por DDD, grupo de WhatsApp ou cidade.
 */
function v3_sinais_(valor,somenteNome){
 const s=v3_normal_(valor);
 if(!s||s==='NAO_INFORMADO'||s==='NAO_CONFIRMADO')return {bike:false,passos:false};
 const bike=/CICL|PEDAL|BIKE|MTB|SPEED|GRAVEL|URBANO/.test(s);
 const passos=/CAMINH|CORRIDA|CORRER|RUNNING|PEDESTRE/.test(s);
 return {bike:bike,passos:passos};
}
function v3_perfil_(s){
 if(s.bike&&s.passos)return 'AMBOS';
 if(s.bike)return 'CICLISMO';
 if(s.passos)return 'CAMINHADA_CORRIDA';
 return 'NAO_IDENTIFICADO';
}
function v3_indiceEsportivo_(portal){
 let cache=null;
 try{if(typeof CacheService!=='undefined')cache=CacheService.getScriptCache();}catch(e){}
 if(cache){try{const hit=cache.get('DG_V3_ESPORTE_V1');if(hit){const v=JSON.parse(hit);if(v&&v.porId&&v.idsPorTelefone)return v;}}catch(e){}}
 const pessoas=v3_tabela_(portal,'DadosPessoais',['ID_DGMB','whatsapp']).records;
 const inscricoes=v3_tabela_(portal,'dgmbDesafios',['ID_DGMB','Observacao','Modalidade_Esportiva']).records;
 const cat=v3_catalogo_(portal);
 const porId=Object.create(null),idsPorTelefone=Object.create(null);
 pessoas.forEach(p=>{
  const id=v3_texto_(p.ID_DGMB),tel=v3_fone_(p.whatsapp);
  if(!id)return;
  if(tel){if(!idsPorTelefone[tel])idsPorTelefone[tel]=[];if(!idsPorTelefone[tel].includes(id))idsPorTelefone[tel].push(id);}
 });
 inscricoes.forEach(i=>{
  const id=v3_texto_(i.ID_DGMB);if(!id)return;
  const d=cat.porId[v3_idDesafio_(i)]||{};
  const registro=v3_sinais_(i.Modalidade_Esportiva);
  const oficial=v3_sinais_(d.modalidade);
  const nome=v3_sinais_(d.nome,true);
  const sinais=(registro.bike||registro.passos)?registro:
    (oficial.bike||oficial.passos)?oficial:nome;
  if(!porId[id])porId[id]={bike:false,passos:false};
  porId[id].bike=porId[id].bike||sinais.bike;
  porId[id].passos=porId[id].passos||sinais.passos;
 });
 const result={porId:porId,idsPorTelefone:idsPorTelefone};
 if(cache){try{const serial=JSON.stringify(result);if(serial.length<85000)cache.put('DG_V3_ESPORTE_V1',serial,120);}catch(e){}}
 return result;
}
function v3_classificarContato_(c,indice){
 const manual=v3_sinais_(c.MODALIDADE);
 if(manual.bike||manual.passos)return v3_perfil_(manual);
 const id=v3_texto_(c.ID_DGMB);
 if(id&&indice.porId[id])return v3_perfil_(indice.porId[id]);
 const tel=v3_fone_(c.TELEFONE_NORMALIZADO);
 const ids=indice.idsPorTelefone[tel]||[];
 if(ids.length===1){
  const perfil=v3_perfil_(indice.porId[ids[0]]||{bike:false,passos:false});
  if(perfil!=='NAO_IDENTIFICADO')return perfil;
 }
 if(v3_normal_(c.E_CICLISTA)==='SIM')return 'CICLISMO';
 return 'NAO_IDENTIFICADO';
}
function v3_origensListar_ (marketing){
 const o=v3_tabela_(marketing,'Relacionamento_Origens',['ID_ORIGEM','NOME_ORIGEM','STATUS']).records;
 const t=v3_tabela_(marketing,'Relacionamento_ContatoOrigens',['TELEFONE_NORMALIZADO','ID_ORIGEM']).records;
 const nomes=Object.create(null),vinculos=Object.create(null);
 for(const r of o)nomes[r.ID_ORIGEM]=r.NOME_ORIGEM;
 for(const r of t){
  const tel=v3_fone_(r.TELEFONE_NORMALIZADO);
  if(!tel||!r.ID_ORIGEM)continue;
  if(!vinculos[tel])vinculos[tel]=[];
  if(!vinculos[tel].includes(r.ID_ORIGEM))vinculos[tel].push(r.ID_ORIGEM);
 }
 return {opcoes:o.filter(x=>x.STATUS==='ATIVO').map(x=>({id:x.ID_ORIGEM,nome:x.NOME_ORIGEM})),
   vinculos:vinculos,nomes:nomes};
}
function v3_resumoEtapas_(contatos){
 const cards={PARA_CONTATAR:0,AGUARDANDO_RESPOSTA:0,EM_CONVERSA:0,RETORNAR_DEPOIS:0,FINALIZADO:0,NAO_CONTATAR:0};
 contatos.forEach(c=>{if(Object.prototype.hasOwnProperty.call(cards,c.ETAPA))cards[c.ETAPA]++;});
 return cards;
}
function v3_contatos(filtros){
 const f=filtros||{},b=v3_bases_();
 const tab=v3_tabela_(b.marketing,'Relacionamento_Contatos',
  ['TELEFONE_NORMALIZADO','ETAPA','SITUACAO','NOME_PORTAL']);
 const idx=v3_indiceEsportivo_(b.portal);
 const origens=v3_origensListar_(b.marketing);
 const termo=v3_normal_(f.busca),sport=v3_texto_(f.esporte||'TODOS').toUpperCase(),
   etapa=v3_texto_(f.etapa||'PADRAO').toUpperCase(),
   situacao=v3_texto_(f.situacao||'TODOS').toUpperCase(),
   origem=v3_texto_(f.origem);
 const page=Math.max(1,Math.floor(Number(f.pagina)||1)),
   count=Math.min(100,Math.max(1,Math.floor(Number(f.porPagina)||30)));
 if(!['TODOS','PADRAO',...V3_ETAPAS].includes(etapa))throw Error('Etapa inválida.');
 if(!['TODOS',...V3_SITUACOES].includes(situacao))throw Error('Situação inválida.');
 if(!['TODOS','CICLISMO','CAMINHADA_CORRIDA','AMBOS','NAO_IDENTIFICADO'].includes(sport))throw Error('Esporte inválido.');
 const todos=tab.records.map(c=>{
  const tel=v3_fone_(c.TELEFONE_NORMALIZADO);
  const ids=origens.vinculos[tel]||[];
  return {
   telefone:tel,exibicao:c.TELEFONE_EXIBICAO||tel,
   idDgmb:c.ID_DGMB||'',
   nome:c.NOME_PORTAL||c.NOME_CONTATO||c.NOME_GOOGLE_CONTATOS||'Nome não informado',
   nomeContato:c.NOME_CONTATO||'',cidade:c.CIDADE||'',uf:c.UF||'',
   cidadeUf:c.CIDADE_UF_PORTAL||[c.CIDADE,c.UF].filter(Boolean).join(' - '),
   etapa:c.ETAPA||'PARA_CONTATAR',situacao:c.SITUACAO||'NAO_CLASSIFICADO',
   resultado:c.RESULTADO||'',validade:c.VALIDADE||'',modalidade:c.MODALIDADE||'NAO_INFORMADO',
   perfil:v3_classificarContato_(c,idx),observacao:c.OBSERVACAO||'',
   retorno:v3_dataISO_(c.DATA_PROXIMO_RETORNO),idsOrigens:ids,
   origens:ids.map(id=>origens.nomes[id]).filter(Boolean),
   ordem:c.__linha
  };
 });
 const hoje=v3_hoje_();
 const filtrados=todos.filter(c=>{
  if(etapa==='PADRAO'&&['NAO_CONTATAR','FINALIZADO'].includes(c.etapa))return false;
  if(etapa!=='PADRAO'&&etapa!=='TODOS'&&c.etapa!==etapa)return false;
  if(situacao!=='TODOS'&&c.situacao!==situacao)return false;
  if(sport!=='TODOS'&&!(c.perfil===sport||(sport==='CICLISMO'&&c.perfil==='AMBOS')||
     (sport==='CAMINHADA_CORRIDA'&&c.perfil==='AMBOS')))return false;
  if(origem&&!c.idsOrigens.includes(origem))return false;
  if(f.retornoPendente&&!(c.etapa==='RETORNAR_DEPOIS'&&c.retorno&&c.retorno<=hoje))return false;
  if(!termo)return true;
  return [c.nome,c.nomeContato,c.telefone,c.idDgmb,c.cidadeUf].some(x=>v3_normal_(x).includes(termo));
 }).sort((a,b)=>{
  const vencidoA=a.etapa==='RETORNAR_DEPOIS'&&a.retorno&&a.retorno<=hoje?0:1;
  const vencidoB=b.etapa==='RETORNAR_DEPOIS'&&b.retorno&&b.retorno<=hoje?0:1;
  return vencidoA-vencidoB||a.ordem-b.ordem;
 });
 const total=filtrados.length,paginas=Math.max(1,Math.ceil(total/count));
 const actual=Math.min(page,paginas);
 return v3_resposta_('OK',{
   registros:filtrados.slice((actual-1)*count,actual*count).map(({ordem,idsOrigens,...c})=>c),
   total:total,pagina:actual,paginas:paginas,
   indicadores:v3_resumoEtapas_(tab.records),origens:origens.opcoes,
   edicao:b.config.edicao,ambiente:b.config.ambiente
 });
}
function v3_historico_(book,phone,tipo,antes,depois){
 const t=v3_tabela_(book,'Relacionamento_Historico',
   ['ID_EVENTO','TELEFONE_NORMALIZADO','TIPO_EVENTO','DATA_HORA','VALOR_ANTERIOR','VALOR_NOVO','DETALHE','USUARIO']);
 const row=Array(t.header.length).fill('');
 const values={ID_EVENTO:Utilities.getUuid(),TELEFONE_NORMALIZADO:phone,
   TIPO_EVENTO:tipo,DATA_HORA:new Date(),VALOR_ANTERIOR:v3_seguroCelula_(antes),
   VALOR_NOVO:v3_seguroCelula_(depois),DETALHE:'Alteração pelo sistema V3',
   USUARIO:Session.getEffectiveUser().getEmail()||'ADMIN'};
 for(const k of Object.keys(values))row[t.header.indexOf(k)]=values[k];
 t.sheet.appendRow(row);
}
function v3_salvarContato(dados){
 v3_escrita_();
 return v3_lock_(()=>{
  const phone=v3_fone_(dados&&dados.telefone);
  if(!phone)throw Error('Telefone inválido.');
  const book=v3_bases_().marketing;
  const tabela=v3_tabela_(book,'Relacionamento_Contatos',
    ['TELEFONE_NORMALIZADO','ETAPA','SITUACAO','DATA_PROXIMO_RETORNO','ATUALIZADO_EM']);
  const c=tabela.records.find(x=>x.TELEFONE_NORMALIZADO===phone);
  if(!c)throw Error('Contato não localizado.');
  const edit=Object.create(null),audit=[];
  if(Object.prototype.hasOwnProperty.call(dados,'etapa')){
   const etapa=v3_texto_(dados.etapa).toUpperCase();
   if(!V3_ETAPAS.includes(etapa))throw Error('Etapa inválida.');
   edit.ETAPA=etapa;
   audit.push(['ETAPA',c.ETAPA,etapa]);
   const data=v3_dataISO_(dados.retorno);
   if(etapa==='RETORNAR_DEPOIS'){
     if(!data)throw Error('Informe a data do próximo retorno.');
     edit.DATA_PROXIMO_RETORNO=data;
   }else if(etapa==='NAO_CONTATAR'||dados.limparRetorno===true){
     edit.DATA_PROXIMO_RETORNO='';
   }else if(c.DATA_PROXIMO_RETORNO&&v3_dataISO_(c.DATA_PROXIMO_RETORNO)&&etapa==='PARA_CONTATAR'){
     throw Error('Confirme a limpeza do retorno antes de voltar a Para Contatar.');
   }
  }
  if(Object.prototype.hasOwnProperty.call(dados,'situacao')){
   const valor=v3_texto_(dados.situacao).toUpperCase();
   if(!V3_SITUACOES.includes(valor))throw Error('Situação inválida.');
   edit.SITUACAO=valor;audit.push(['SITUACAO',c.SITUACAO,valor]);
  }
  if(Object.prototype.hasOwnProperty.call(dados,'observacao')){
   const val=v3_texto_(dados.observacao);
   if(val.length>2000)throw Error('Observação muito longa.');
   edit.OBSERVACAO=v3_seguroCelula_(val);audit.push(['OBSERVACAO','[alterada]','[alterada]']);
  }
  if(Object.prototype.hasOwnProperty.call(dados,'nomeContato')){
   const val=v3_texto_(dados.nomeContato);
   if(val.length>120)throw Error('Nome muito longo.');
   edit.NOME_CONTATO=v3_seguroCelula_(val);
  }
  if(Object.prototype.hasOwnProperty.call(dados,'modalidade')){
   const val=v3_texto_(dados.modalidade).toUpperCase();
   const permitidos=['NAO_INFORMADO','CICLISMO','CAMINHADA','CORRIDA','CAMINHADA_CORRIDA','CICLISMO_E_CAMINHADA_CORRIDA','MTB','SPEED','GRAVEL','URBANO','MULTIPLAS'];
   if(!permitidos.includes(val))throw Error('Modalidade inválida.');
   edit.MODALIDADE=val;audit.push(['MODALIDADE',c.MODALIDADE,val]);
  }
  if(!Object.keys(edit).length)throw Error('Nenhuma alteração fornecida.');
  edit.ATUALIZADO_EM=new Date();
  v3_gravarCampos_(tabela,c,edit);
  for(const [tipo,antes,depois] of audit)if(antes!==depois)v3_historico_(book,phone,tipo,antes,depois);
  return v3_resposta_('OK',{},'Contato atualizado.');
 });
}
function v3_origens(){
 const b=v3_bases_(),o=v3_origensListar_(b.marketing);
 return v3_resposta_('OK',{origens:o.opcoes});
}
function v3_novaOrigem(dados){
 v3_escrita_();
 return v3_lock_(()=>{
  const b=v3_bases_().marketing;
  const tab=v3_tabela_(b,'Relacionamento_Origens',
    ['ID_ORIGEM','NOME_ORIGEM','TIPO_ORIGEM','STATUS','DATA_CADASTRO','OBSERVACAO']);
  const nome=v3_texto_(dados&&dados.nome),tipo=v3_texto_(dados&&dados.tipo).toUpperCase();
  if(!nome||nome.length>120||!['GRUPO_WHATSAPP','LOJA','EVENTO','LISTA_MANUAL','OUTRO'].includes(tipo))
   throw Error('Nome ou tipo de origem inválido.');
  if(tab.records.some(r=>v3_normal_(r.NOME_ORIGEM)===v3_normal_(nome)))throw Error('Origem já cadastrada.');
  const id='ORG_'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
  const vals={ID_ORIGEM:id,NOME_ORIGEM:v3_seguroCelula_(nome),TIPO_ORIGEM:tipo,STATUS:'ATIVO',DATA_CADASTRO:new Date(),OBSERVACAO:''};
  const row=tab.header.map(h=>vals[h]||'');
  tab.sheet.appendRow(row);
  return v3_resposta_('OK',{id:id},'Origem cadastrada.');
 });
}
