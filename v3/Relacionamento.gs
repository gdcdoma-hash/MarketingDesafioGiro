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
 // Chave vinculada à planilha do Portal: trocar LAB/PROD não reaproveita
 // IDs e telefones cacheados do outro ambiente.
 const chaveCache='DG_V3_ESPORTE_V2_'+v3_config_().portalId;
 let cache=null;
 try{if(typeof CacheService!=='undefined')cache=CacheService.getScriptCache();}catch(e){}
 if(cache){try{const hit=cache.get(chaveCache);if(hit){const v=JSON.parse(hit);if(v&&v.porId&&v.idsPorTelefone)return v;}}catch(e){}}
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
 if(cache){try{const serial=JSON.stringify(result);if(serial.length<85000)cache.put(chaveCache,serial,120);}catch(e){}}
 return result;
}
function v3_classificarContato_(c,indice){
 const manual=v3_sinais_(c.MODALIDADE);
 if(manual.bike||manual.passos)return v3_perfil_(manual);
 const id=v3_texto_(c.ID_DGMB);
 if(id&&indice.porId[id]){
  const perfil=v3_perfil_(indice.porId[id]);
  if(perfil!=='NAO_IDENTIFICADO')return perfil;
 }
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
/**
 * Regras únicas para a fila operacional e os indicadores.
 * Nunca muda a etapa armazenada nem reverte opt-out automaticamente.
 */
/**
 * Versão otimista baseada no conteúdo editável; não depende da formatação
 * de data/hora do Google Sheets. Alterações de outro editor exigem recarga.
 */
function v3_versaoContato_(c){
 const campos=['TELEFONE_NORMALIZADO','ATUALIZADO_EM','ETAPA','SITUACAO',
  'RESULTADO','VALIDADE','DATA_PROXIMO_RETORNO','MODALIDADE','NOME_CONTATO',
  'OBSERVACAO','E_CICLISTA'];
 return JSON.stringify(campos.map(campo=>v3_texto_(c[campo])));
}
function v3_bloqueadoContato_(c){
 const etapa=v3_normal_(c.etapa||c.ETAPA);
 const situacao=v3_normal_(c.situacao||c.SITUACAO);
 const resultado=v3_normal_(c.resultado||c.RESULTADO);
 const validade=v3_normal_(c.validade||c.VALIDADE);
 return etapa==='NAO_CONTATAR'||validade==='INVALIDO'||
  ['NAO_DESEJA_CONTATO','SEM_INTERESSE','CONTATO_INADEQUADO'].includes(situacao)||
  ['NAO_CONTATAR','SEM_INTERESSE','NAO_DESEJA_CONTATO'].includes(resultado);
}
function v3_resumoEtapas_(contatos,hoje){
 const cards={PARA_CONTATAR:0,AGUARDANDO_RESPOSTA:0,EM_CONVERSA:0,RETORNAR_DEPOIS:0,
  FINALIZADO:0,NAO_CONTATAR:0,BLOQUEADOS:0,RETORNAR_HOJE:0};
 contatos.forEach(c=>{
  const etapa=c.etapa||c.ETAPA;
  if(Object.prototype.hasOwnProperty.call(cards,etapa))cards[etapa]++;
  const bloqueado=!!c.bloqueado||v3_bloqueadoContato_(c);
  if(bloqueado)cards.BLOQUEADOS++;
  if(!bloqueado&&etapa==='RETORNAR_DEPOIS'){
   const data=v3_dataISO_(c.retorno||c.DATA_PROXIMO_RETORNO);
   if(data&&data<=hoje)cards.RETORNAR_HOJE++;
  }
 });
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
 const frequencias=new Map();
 for(const c of tab.records){const tel=v3_fone_(c.TELEFONE_NORMALIZADO);if(tel)frequencias.set(tel,(frequencias.get(tel)||0)+1);}
 const todos=tab.records.map(c=>{
  const tel=v3_fone_(c.TELEFONE_NORMALIZADO);
  const ids=origens.vinculos[tel]||[];
  const portalIds=idx.idsPorTelefone[tel]||[];
  const conflito=(frequencias.get(tel)||0)>1||portalIds.length>1||(portalIds.length===1&&!!c.ID_DGMB&&c.ID_DGMB!==portalIds[0]);
  return {
   telefone:tel,exibicao:c.TELEFONE_EXIBICAO||tel,
   idDgmb:conflito?'':(c.ID_DGMB||portalIds[0]||''),
   conflitoIdentidade:conflito,atletaPortal:portalIds.length===1&&!conflito,
   nome:c.NOME_CONTATO||c.NOME_PORTAL||c.NOME_GOOGLE_CONTATOS||'Nome não informado',
   nomePortal:c.NOME_PORTAL||'',nomeGoogle:c.NOME_GOOGLE_CONTATOS||'',
   nomeContato:c.NOME_CONTATO||'',cidade:c.CIDADE||'',uf:c.UF||'',
   cidadeUf:c.CIDADE_UF_PORTAL||[c.CIDADE,c.UF].filter(Boolean).join(' - '),
   etapa:c.ETAPA||'PARA_CONTATAR',situacao:c.SITUACAO||'NAO_CLASSIFICADO',
   resultado:c.RESULTADO||'',validade:c.VALIDADE||'',modalidade:c.MODALIDADE||'NAO_INFORMADO',
   perfil:v3_classificarContato_(c,idx),observacao:c.OBSERVACAO||'',
   versao:v3_versaoContato_(c),
   retorno:v3_dataISO_(c.DATA_PROXIMO_RETORNO),
   bloqueado:!tel||v3_bloqueadoContato_(c)||conflito,idsOrigens:ids,
   origens:[...new Set([...ids.map(id=>origens.nomes[id]).filter(Boolean),...(portalIds.length===1&&!conflito?['Portal Giro']:[])])],
   ordem:c.__linha
  };
 });
 const hoje=v3_hoje_();
 const filtrados=todos.filter(c=>{
  const bloqueado=c.bloqueado||v3_bloqueadoContato_(c);
  // Sem busca, PADRAO é fila de abordagem. Com nome/telefone/ID digitado,
  // localizar também o histórico de bloqueados/finalizados (sem liberar contato).
  if(etapa==='PADRAO'&&!termo&&(bloqueado||c.etapa==='FINALIZADO'))return false;
  if(etapa!=='PADRAO'&&etapa!=='TODOS'&&c.etapa!==etapa)return false;
  if(situacao!=='TODOS'&&c.situacao!==situacao)return false;
  if(sport!=='TODOS'&&!(c.perfil===sport||(sport==='CICLISMO'&&c.perfil==='AMBOS')||
     (sport==='CAMINHADA_CORRIDA'&&c.perfil==='AMBOS')))return false;
  if(origem&&!c.idsOrigens.includes(origem))return false;
  if(f.retornoPendente&&(bloqueado||!(c.etapa==='RETORNAR_DEPOIS'&&c.retorno&&c.retorno<=hoje)))return false;
  if(!termo)return true;
  const digits=termo.replace(/\D/g,'');
  return [c.nome,c.nomeContato,c.nomePortal,c.nomeGoogle,c.telefone,c.idDgmb,c.cidadeUf].some(x=>v3_normal_(x).includes(termo))||(/^[\d\s()+.-]+$/.test(termo)&&digits.length>=3&&c.telefone.includes(digits));
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
   indicadores:v3_resumoEtapas_(todos,hoje),origens:origens.opcoes,
   edicao:b.config.edicao,ambiente:b.config.ambiente
 });
}
/**
 * Valida o esquema do histórico antes de modificar o contato.
 * Um único append por operação, mesmo quando vários campos mudam.
 */
function v3_prepararHistorico_(book,phone,alteracoes){
 if(!alteracoes.length)return null;
 const t=v3_tabela_(book,'Relacionamento_Historico',
  ['ID_EVENTO','TELEFONE_NORMALIZADO','TIPO_EVENTO','DATA_HORA',
   'VALOR_ANTERIOR','VALOR_NOVO','DETALHE','USUARIO']);
 const now=new Date(),usuario=Session.getEffectiveUser().getEmail()||'ADMIN';
 const rows=alteracoes.map(([tipo,antes,depois,detalhe])=>{
  const obj={ID_EVENTO:Utilities.getUuid(),TELEFONE_NORMALIZADO:phone,
   TIPO_EVENTO:tipo,DATA_HORA:now,VALOR_ANTERIOR:v3_seguroCelula_(antes),
   VALOR_NOVO:v3_seguroCelula_(depois),
   DETALHE:v3_seguroCelula_(detalhe||'Alteração pelo sistema V3'),USUARIO:usuario};
  return t.header.map(h=>Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'');
 });
 return {sheet:t.sheet,rows:rows,colunas:t.header.length,inicio:0};
}
function v3_gravarHistorico_(preparado){
 if(!preparado||!preparado.rows.length)return;
 preparado.sheet.getRange(preparado.inicio,1,
  preparado.rows.length,preparado.colunas).setValues(preparado.rows);
}
function v3_salvarContato(dados){
 v3_escrita_();
 return v3_lock_(()=>{
  const phone=v3_fone_(dados&&dados.telefone);
  if(!phone)throw Error('Telefone inválido.');
  const book=v3_bases_().marketing;
  const tabela=v3_tabela_(book,'Relacionamento_Contatos',
    ['TELEFONE_NORMALIZADO','ETAPA','SITUACAO','DATA_PROXIMO_RETORNO','ATUALIZADO_EM']);
  const c=tabela.records.find(x=>v3_fone_(x.TELEFONE_NORMALIZADO)===phone);
  if(!c)throw Error('Contato não localizado.');
  if(tabela.records.filter(x=>v3_fone_(x.TELEFONE_NORMALIZADO)===phone).length!==1)throw Error('Telefone com cadastros duplicados. Resolva o conflito antes de editar.');
  // Sempre compare dentro do lock e antes de qualquer setValue.
  if(!dados||typeof dados.versao!=='string'||
     dados.versao!==v3_versaoContato_(c))
    throw Error('Contato alterado após a consulta. Atualize a lista antes de salvar.');
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
  if(Object.prototype.hasOwnProperty.call(dados,'resultadoContato')){
   const resultado=v3_texto_(dados.resultadoContato).toUpperCase();
   const permitidos=['AGUARDANDO_RESPOSTA','EM_CONVERSA','RETORNAR_DEPOIS',
    'SEM_INTERESSE','NAO_DESEJA_CONTATO','FINALIZADO','REATIVADO'];
   if(!permitidos.includes(resultado))throw Error('Resultado do contato inválido.');
   if(resultado==='REATIVADO'){
    if(!v3_bloqueadoContato_(c)||v3_normal_(c.VALIDADE)==='INVALIDO')
     throw Error('Reativação permitida apenas para contato bloqueado com telefone válido.');
    if(dados.autorizarReativacao!==true||
       edit.ETAPA!=='PARA_CONTATAR'||edit.SITUACAO!=='PODE_CONTATAR')
     throw Error('Reativação exige confirmação, etapa e situação corretas.');
   }
   if(resultado==='RETORNAR_DEPOIS'&&edit.ETAPA!=='RETORNAR_DEPOIS')
    throw Error('Retorno exige a etapa Retornar depois e uma data.');
   if(['SEM_INTERESSE','NAO_DESEJA_CONTATO'].includes(resultado)&&
      (edit.ETAPA!=='NAO_CONTATAR'||!['SEM_INTERESSE','NAO_DESEJA_CONTATO'].includes(edit.SITUACAO)))
    throw Error('Recusa exige situação e etapa de bloqueio.');
   edit.RESULTADO=resultado;
   audit.push(['RESULTADO',c.RESULTADO,resultado]);
  }
  if(Object.prototype.hasOwnProperty.call(dados,'observacao')){
   const val=v3_texto_(dados.observacao);
   if(val.length>2000)throw Error('Observação muito longa.');
   edit.OBSERVACAO=v3_seguroCelula_(val);
   if(val!==v3_texto_(c.OBSERVACAO))
    audit.push(['OBSERVACAO','[texto anterior]','[texto atualizado]']);
  }
  if(Object.prototype.hasOwnProperty.call(dados,'nomeContato')){
   const val=v3_texto_(dados.nomeContato);
   if(val.length>120)throw Error('Nome muito longo.');
   edit.NOME_CONTATO=v3_seguroCelula_(val);
   if(val!==v3_texto_(c.NOME_CONTATO))
    audit.push(['NOME_CONTATO','[nome anterior]','[nome atualizado]']);
  }
  if(Object.prototype.hasOwnProperty.call(dados,'modalidade')){
   const val=v3_texto_(dados.modalidade).toUpperCase();
   const permitidos=['NAO_INFORMADO','CICLISMO','CAMINHADA','CORRIDA','CAMINHADA_CORRIDA','CICLISMO_E_CAMINHADA_CORRIDA','MTB','SPEED','GRAVEL','URBANO','MULTIPLAS'];
   if(!permitidos.includes(val))throw Error('Modalidade inválida.');
   edit.MODALIDADE=val;audit.push(['MODALIDADE',c.MODALIDADE,val]);
  }
  if(!Object.keys(edit).length)throw Error('Nenhuma alteração fornecida.');
  if(Object.prototype.hasOwnProperty.call(edit,'DATA_PROXIMO_RETORNO')&&
     edit.DATA_PROXIMO_RETORNO!==v3_texto_(c.DATA_PROXIMO_RETORNO))
   audit.push(['RETORNO',v3_texto_(c.DATA_PROXIMO_RETORNO),
    edit.DATA_PROXIMO_RETORNO||'[removido]']);
  const depois={...c,...edit};
  const desbloqueio=v3_bloqueadoContato_(c)&&!v3_bloqueadoContato_(depois);
  if(desbloqueio){
   const motivo=v3_texto_(dados.motivoReativacao);
   if(dados.autorizarReativacao!==true||motivo.length<10||motivo.length>300)
    throw Error('Reativação exige confirmação e motivo entre 10 e 300 caracteres.');
   audit.push(['REATIVACAO','BLOQUEADO','LIBERADO',motivo]);
  }
  const alteracoes=audit.filter(([tipo,antes,depois])=>antes!==depois);
  // Preflight do histórico e das colunas: falhas de esquema não causam escrita parcial.
  const historico=v3_prepararHistorico_(book,phone,alteracoes);
  for(const campo of Object.keys(edit))
   if(tabela.header.indexOf(campo)<0)throw Error('Coluna ausente: '+campo);
  if(historico)historico.inicio=v3_prepararEspaco_(historico.sheet,historico.rows.length);
  edit.ATUALIZADO_EM=new Date();
  v3_gravarCampos_(tabela,c,edit);
  v3_gravarHistorico_(historico);
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
  if(!nome||nome.length>120||!['GRUPO_WHATSAPP','GOOGLE_CONTATOS','LOJA','EVENTO','LISTA_MANUAL','OUTRO'].includes(tipo))
   throw Error('Nome ou tipo de origem inválido.');
  if(tab.records.some(r=>v3_normal_(r.NOME_ORIGEM)===v3_normal_(nome)))throw Error('Origem já cadastrada.');
  const id='ORG_'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
  const vals={ID_ORIGEM:id,NOME_ORIGEM:v3_seguroCelula_(nome),TIPO_ORIGEM:tipo,STATUS:'ATIVO',DATA_CADASTRO:new Date(),OBSERVACAO:''};
  const row=tab.header.map(h=>vals[h]||'');
  tab.sheet.appendRow(row);
  return v3_resposta_('OK',{id:id},'Origem cadastrada.');
 });
}

/** Consulta Portal somente leitura. Nunca modifica atletas nem une IDs conflitantes. */
function v3_planoPortal_(bases){
 const pessoas=v3_tabela_(bases.portal,'DadosPessoais',['ID_DGMB','whatsapp']).records;
 const tab=v3_tabela_(bases.marketing,'Relacionamento_Contatos',['TELEFONE_NORMALIZADO','ID_DGMB','NOME_PORTAL','NOME_CONTATO','ETAPA','SITUACAO']);
 const porTel=new Map(),existentes=new Map();
 let semTelefone=0;
 for(const p of pessoas){
  const tel=v3_fone_(p.whatsapp),id=v3_texto_(p.ID_DGMB);
  if(!tel||!id){semTelefone++;continue;}
  if(!porTel.has(tel))porTel.set(tel,new Map());
  porTel.get(tel).set(id,p);
 }
 for(const c of tab.records){
  const tel=v3_fone_(c.TELEFONE_NORMALIZADO);
  if(!existentes.has(tel))existentes.set(tel,[]);
  existentes.get(tel).push(c);
 }
 const novos=[],vincular=[];let conflitos=0,existentesOk=0;
 for(const [tel,ids] of porTel){
  const atuais=existentes.get(tel)||[];
  if(ids.size!==1||atuais.length>1){conflitos++;continue;}
  const [id,p]=Array.from(ids.entries())[0];
  const nome=v3_texto_(p.nome||p.Nome||p.NOME);
  const cidade=v3_texto_(p['Cidade-UF']||p.Cidade_UF||p.cidade_uf||p.Cidade||p.cidade);
  if(!atuais.length){novos.push({tel,id,nome,cidade});continue;}
  const c=atuais[0];
  if(c.ID_DGMB&&c.ID_DGMB!==id){conflitos++;continue;}
  existentesOk++;
  const edit={};
  if(!c.ID_DGMB)edit.ID_DGMB=id;
  if(!c.NOME_PORTAL&&nome)edit.NOME_PORTAL=v3_seguroCelula_(nome);
  if(tab.header.includes('CIDADE_UF_PORTAL')&&!c.CIDADE_UF_PORTAL&&cidade)edit.CIDADE_UF_PORTAL=v3_seguroCelula_(cidade);
  if(Object.keys(edit).length)vincular.push({c,edit});
 }
 return {tab,novos,vincular,resumo:{atletas:pessoas.length,telefonesUnicos:porTel.size,semTelefone,conflitos,existentes:existentesOk,novos:novos.length,vincular:vincular.length}};
}
function v3_analisarPortal(){
 return v3_resposta_('OK',v3_planoPortal_(v3_bases_()).resumo,'Comparação concluída. Nenhuma gravação.');
}
function v3_sincronizarPortal(dados){
 v3_escrita_();
 if(!dados||dados.confirmar!==true)throw Error('Confirme a sincronização.');
 return v3_lock_(()=>{
  const b=v3_bases_(),p=v3_planoPortal_(b),tab=p.tab,agora=new Date();
  const novos=p.novos.slice(0,300),vincular=p.vincular.slice(0,300-novos.length);
  const rows=novos.map(n=>{
   const vals={TELEFONE_NORMALIZADO:n.tel,TELEFONE_EXIBICAO:n.tel,ID_DGMB:n.id,NOME_PORTAL:v3_seguroCelula_(n.nome),CIDADE_UF_PORTAL:v3_seguroCelula_(n.cidade),ETAPA:'PARA_CONTATAR',SITUACAO:'NAO_CLASSIFICADO',MODALIDADE:'NAO_INFORMADO',E_CICLISTA:'NAO_CONFIRMADO',DATA_PRIMEIRA_IMPORTACAO:agora,ATUALIZADO_EM:agora};
   return tab.header.map(h=>vals[h]||'');
  });
  if(rows.length){const inicio=v3_prepararEspaco_(tab.sheet,rows.length);tab.sheet.getRange(inicio,1,rows.length,tab.header.length).setValues(rows);}
  for(const x of vincular)v3_gravarCampos_(tab,x.c,x.edit);
  return v3_resposta_('OK',{gravados:rows.length,vinculados:vincular.length,restantes:p.novos.length+p.vincular.length-rows.length-vincular.length,conflitos:p.resumo.conflitos},'Sincronização de lote concluída. Portal preservado.');
 });
}
