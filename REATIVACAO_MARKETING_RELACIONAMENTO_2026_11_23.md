# Reativação independente — Marketing e Relacionamento (23/11/2026)

## Decisão funcional
O projeto `MarketingDesafioGiro` permanece separado do Portal Giro, com a planilha **MarketingContatoRelacionamento** como banco próprio para `Marketing`, `Relacionamento_Contatos`, origens, vínculos e histórico. **Não migrar** essas abas para o Portal Giro.

O projeto consulta o Portal Giro em `DadosPessoais`, `dgmbDesafios` e `ListaDesafios`. O uso de `ID_DGMB` liga os cadastros; o telefone normalizado ajuda a identificar quais contatos importados correspondem a participantes do Portal.

## Referências (REF)
1. A REF é cadastrada e mantida **na própria aba Marketing** (código do divulgador, nome/origem e status).
2. O mini sistema gera links como `https://desafiogiro.gmbd.com.br/?ref=CODIGO`.
3. Na conclusão da inscrição, o **Portal Giro** deve gravar esse código em `dgmbDesafios.REF_MARKETING`; o sistema de Divulgação consulta esse campo e atribui a inscrição ao divulgador certo. Não gravar REF por suposição, telefone ou nome.
4. Na tela Contatos, o operador pode escolher uma REF ativa cadastrada para inserir o código no convite do WhatsApp. Se escolher `Sem referência`, o link do convite é genérico e não gera atribuição.
5. **Pendência de integração:** verificar no Portal atual se o parâmetro `ref` atravessa redirecionamentos, a futura landing page do desafio, cadastro, escolha de modalidade, pagamento e gravação final em `REF_MARKETING`. Não foi feita inscrição teste nem modificada a base oficial.

## Campanhas futuras
- **Medalha Transmissão:** PEDALADA/CICLISMO. São duas etapas, e devem aparecer individualmente quando receberem IDs em `ListaDesafios`.
- **Medalha Coração:** CORRIDA/CAMINHADA. Uma etapa.
- **Selim e 50 km:** não foram divulgados por este sistema. REF vazia nesses desafios **não é defeito nem dívida de correção**; nenhum preenchimento retroativo.
- O filtro de Marketing é por mês e, opcionalmente, por `id_Desafio_lista`, independentemente dos nomes, para poder ser reutilizado.
- Quando Transmissão/Coração ainda não constarem da lista, não criar IDs de desafio artificiais.

## Reconhecimento esportivo
- A planilha de inscrição do Portal já possui `Modalidade_Esportiva` com valores `CICLISMO` e `CAMINHADA_CORRIDA`.
- Os dados de `DadosPessoais` e `dgmbDesafios` são consultados por ID/telefone; valores explícitos de modalidade nas inscrições prevalecem como evidência de prática. Na ausência desse campo em registros antigos, apenas nomes de desafios inequívocos são usados como evidência.
- Para contatos importados fora do Portal, a classificação pode ser informada manualmente na **coluna existente `MODALIDADE`**. Tipos antigos MTB, speed, gravel, urbano e `MULTIPLAS` continuam compatíveis com ciclismo.
- Exibir perfis `CICLISMO`, `CAMINHADA_CORRIDA`, `AMBOS` e `NAO_IDENTIFICADO`. Não inferir pelo grupo de WhatsApp, DDD ou cidade. Quando o mesmo telefone estiver atribuído a cadastros diferentes, não presumir modalidade do Portal.
- O filtro por esporte inclui `AMBOS` em cada modalidade individual; ao preparar convite para contato com duas modalidades ou não identificado, a campanha precisa ser escolhida manualmente.

## WhatsApp
- O botão de WhatsApp monta texto **Transmissão = pedalada** ou **Coração = corrida/caminhada**, com nome quando disponível e link do Portal.
- Os textos dizem que as medalhas **estão sendo preparadas**, pois datas de inscrição/landings definitivas não estão disponíveis ainda.
- O sistema somente **abre** o WhatsApp com texto pré-preenchido; não envia automaticamente, não marca mensagem como enviada e bloqueia pessoas marcadas `NAO_CONTATAR`, `NAO_DESEJA_CONTATO` ou `CONTATO_INADEQUADO`.
- Respeitar preferências de não contato e evitar disparos não consentidos de números importados de grupos.

## Testes e homologação
- Revisão isolada de sintaxe JS: aprovada para os módulos alterados.
- Cenários simulados de reconhecimento esportivo: ciclismo, caminhada/corrida, ambos, manual, desconhecido, telefone ambíguo e filtro por modalidade aprovados.
- Testes adicionais no repositório: `tests/marketing_desafios_recorte.test.js` e `tests/rel_esporte_campanhas.test.js`. A execução desses arquivos em Node/CI e a homologação Apps Script ainda devem ser feitas.
- No LAB, testar abertura do painel, filtros, o botão WhatsApp com texto correto, escolha da REF e comparação de contatos com o Portal; não enviar mensagens reais no teste.
- Verificar `Script Properties.DG_PORTAL_SPREADSHEET_ID` e permissão de acesso à fonte oficial no contexto do proprietário do Apps Script.
- **Ponto crítico de segurança:** o `appsscript.json` ainda declara `ANYONE_ANONYMOUS` e o módulo Relacionamento trabalha com telefones pessoais. Não publicar enquanto a autorização dos usuários e dos endpoints `google.script.run` não for corrigida e testada. O mesmo vale para o acesso administrativo às buscas de atletas no Marketing.
- A publicação do PR no GitHub **não atualiza automaticamente** o deployment Apps Script; exigir teste e revisão de `clasp` antes de produção.

## Não fazer
- Não migrar para Supabase, não criar novas planilhas, não duplicar contatos do Google Contatos.
- Não alterar ou preencher REFs antigas no Portal.
- Não inventar IDs de desafio e nem afirmar que novas inscrições já estão abertas.
- Não realizar disparo automático no WhatsApp.
