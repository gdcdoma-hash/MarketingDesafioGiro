# Desafio Giro — Sistema de Marketing e Relacionamento V3 (reconstrução limpa)

## Objetivo

Substituir os inúmeros serviços, telas duplicadas, rotas e scripts históricos por **um aplicativo Web administrativo novo**, com **dois módulos no mesmo painel**:

1. **Marketing:** competência pelo mês de realização do desafio (`ListaDesafios.Periodo`), seleção de qualquer desafio cadastrado, metas geral e individual, desempenho e atribuição por REF, cadastro de divulgadores, ativar/inativar origem
2. **Relacionamento:** contatos operacionais, situação/etapa, retorno, notas, modalidade esportiva, filtros e paginação, origens, importação CSV com pré-análise, histórico e convite manual por desafio escolhido

**Não existem condições especiais para o nome de uma medalha.** Inscrições iniciadas em novembro para desafio de dezembro contam em dezembro. O início da inscrição pode ser antes ou dentro do mês do desafio.

## Arquivos do aplicativo V3 (e somente estes)

- `Config.gs` — configurações, acesso isolado, validações, planilhas e catálogo
- `Marketing.gs` — desafios, metas e resultado por REF
- `Relacionamento.gs` — contatos, classificação, alterações, origens e histórico
- `Importacao.gs` — prévia, deduplicação, confirmação e vínculos
- `Index.html` — interface única responsiva, desktop e celular
- `appsscript.json` — V8, proprietário, **acesso somente eu**

O repositório pode continuar contendo arquivos legados para preservar histórico. **O pacote de deploy inclui exclusivamente os seis arquivos de `v3/`**, nunca arquivos antigos, migrações ou testes. Para isso existe `scripts/preparar-v3-limpa.cjs`.

## Fontes de dados

O novo sistema **não cria planilhas nem copia dados reais**. Ele acessa diretamente:

| Ambiente | Marketing/Relacionamento (leitura e escrita autorizada) | Portal Giro (somente leitura) |
|---|---|---|
| LAB | `1bHR_mjL4vrVOTv-szVd__X3sgM0k4zhBe947I3hZcgE` | `1pVIcTNdZN8yuEqyQ_WQ_aNfWzc9Wq8HcFFaMoye3dMM` |
| PROD | `1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao` | `1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ` |

No LAB os IDs são **fixos e obrigatórios**. Na produção, o app inicia em **modo somente leitura**, e as alterações só podem ocorrer depois de configurar a propriedade `DG_PROD_EDICAO_LIBERADA=SIM`. O Web App deve sempre ter `executeAs: USER_DEPLOYING` e `access: MYSELF`.

### Propriedades necessárias

LAB:
- `DG_AMBIENTE=LAB`
- `DG_MARKETING_SPREADSHEET_ID=1bHR_mjL4vrVOTv-szVd__X3sgM0k4zhBe947I3hZcgE`
- `DG_PORTAL_SPREADSHEET_ID=1pVIcTNdZN8yuEqyQ_WQ_aNfWzc9Wq8HcFFaMoye3dMM`

PROD (outro projeto, nunca o LAB):
- `DG_AMBIENTE=PROD`
- `DG_PORTAL_SPREADSHEET_ID=1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ`
- `DG_PROD_EDICAO_LIBERADA=NAO` até passar em teste de leitura

A planilha Marketing PROD é conhecida e fixa no código, e a propriedade `DG_MARKETING_SPREADSHEET_ID` no PROD é opcional mas, quando informada, deve corresponder ao ID oficial.

## Instalação rápida do LAB V3 — sem criar projeto manualmente

O instalador `scripts/instalar-v3-lab.cjs` **cria um novo projeto Apps Script privado e envia somente os seis arquivos**. Ele NÃO utiliza os IDs do projeto antigo ou do LAB V2, não publica nenhum Web App, não modifica dados e não habilita produção.

1. Baixar no GitHub a branch `clean/marketing-relacionamento-v3-20261123` (**Code → Download ZIP**) e extrair em uma pasta nova. Node.js e `clasp` precisam estar instalados; executar `clasp login` no computador com a conta Google proprietária. Habilitar a Apps Script API se solicitado.
2. No PowerShell dentro da pasta extraída, executar:

```powershell
node .\scripts\instalar-v3-lab.cjs --dry-run
node .\scripts\instalar-v3-lab.cjs --confirmar-novo-lab=SIM
```

3. O instalador cria um novo projeto `DG-Marketing-Relacionamento-V3-LAB` na conta autenticada, confere o ID, remove arquivos de exemplo do `clasp` e envia somente `Config.gs`, `Importacao.gs`, `Index.html`, `Marketing.gs`, `Relacionamento.gs` e `appsscript.json`. O link do editor é exibido ao final. **Nenhuma implantação Web é criada automaticamente.**
4. Abrir o link retornado e executar **`v3_instalarLab()`** no editor. A função configura automaticamente as três propriedades das bases fictícias exclusivas da V3, **somente em um projeto sem propriedades** (ou já corretamente configurado como LAB V3), e executa o diagnóstico de **11 verificações**.
5. Executar **`v3_lab_aceite()`** para validar 13 cenários fictícios adicionais.
6. Implantar Web App: **Executar como Eu / Quem pode acessar: Somente eu**. Verificar bloqueio em janela anônima sem sessão e testar interfaces no desktop/celular.
7. A futura produção exige **outro projeto**, distinto da V3 LAB, com backup da base real e entrada inicial somente leitura. **Não alterar as propriedades de LAB para PROD.**

### Alternativa com ID do script já criado

Se um projeto V3 novo já foi criado manualmente, o gerador `scripts/preparar-v3-limpa.cjs` continua disponível:

```powershell
node .\scripts\preparar-v3-limpa.cjs --dry-run
node .\scripts\preparar-v3-limpa.cjs --script-id=ID_DO_PROJETO_V3_NOVO --confirm-new-project=SIM
```

Dentro da pasta `build\v3-clean-...` resultante, conferir o `.clasp.json` e executar `clasp push`. Depois executar `v3_instalarLab()` no editor e seguir a homologação anterior. O gerador manual **não faz push**, ao contrário do instalador rápido.

## Solução para erro de criação no Windows: .clasp.json não encontrado

Versões anteriores do instalador chamavam `clasp` com `shell:true` no Windows, causando o aviso `DEP0190` e ocultando a saída de diagnóstico. Outro erro real foi `Project file already exists`, pois o instalador criava `build/v3-lab-novo-...` **dentro do repositório histórico que contém `.clasp.json`**. O `clasp` detecta o arquivo no diretório ancestral e não tenta criar o novo script. A versão corrigida cria o destino em `os.tmpdir()/DG-V3-LAB-INSTALACOES/v3-lab-novo-...`, **fora do repositório**, verifica todos os ancestrais e recusa prosseguir caso encontre `.clasp.json`. Ela usa `cmd.exe /d /s /c clasp.cmd`, sem `shell:true`, mostra a saída do `clasp` e recupera o `scriptId` somente quando o Google retorna a URL mas não grava `.clasp.json`. Nunca remove o vínculo do projeto antigo.

**Não executar a versão antiga novamente.** Primeiro, no PowerShell da pasta original, conferir se um projeto V3 LAB já foi criado remotamente:

```powershell
clasp.cmd list-scripts | Select-String 'DG-Marketing-Relacionamento-V3-LAB'
```

- Se houver resultado, **não criar outro**; use o ID existente para recuperar o vínculo com segurança.
- Se não houver resultado, atualizar **somente** o instalador no ZIP já extraído:

```powershell
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/gdcdoma-hash/MarketingDesafioGiro/clean/marketing-relacionamento-v3-20261123/scripts/instalar-v3-lab.cjs' -OutFile '.\scripts\instalar-v3-lab.cjs'
node .\scripts\instalar-v3-lab.cjs --dry-run
node .\scripts\instalar-v3-lab.cjs --confirmar-novo-lab=SIM
```

O novo instalador também consulta `clasp list-scripts` antes de criar, impedindo repetir o mesmo nome de projeto. Se não conseguir listar, recusa a criação e mostra o motivo. Ele nunca publica o Web App ou altera as bases oficiais.

## Proteções e comportamento

- Toda gravação do V3 ocorre **apenas nas abas operacionais** `Marketing` e `Relacionamento_*`. A tabela `dgmbDesafios`, dados pessoais e o catálogo do Portal são sempre consultados, nunca modificados.
- Cadastro e importação não sobrescrevem cadastros existentes. A pré-análise da importação somente lê, informa novos/repetidos/inválidos e limita o lote a 300 registros.
- Campos escritos em Sheets são normalizados para evitar fórmulas vindas de texto ou CSV. As edições de contatos preservam as demais colunas e adicionam eventos no histórico operacional.
- WhatsApp é **manual** e bloqueado no LAB ou em contatos classificados como não contatar. O convite usa o desafio selecionado e sua competência, **sem afirmar que inscrições estão abertas**, e direciona à home oficial com `?ref=...` quando há REF.
- A modalidade do atleta vem preferencialmente da informação declarada, depois da modalidade oficial do desafio e somente então do nome inequívoco no legado. DDD, cidade e grupo de WhatsApp não definem modalidade.
- Contagens das inscrições ignoram cancelamentos, desistências e expirações. Sem REF, REF cadastrada e REF não cadastrada são categorias diferentes. Nenhuma inscrição histórica é atribuída retroativamente.
- Metas são mantidas na Script Property `METAS_MARKETING_V2` do **projeto novo**. Configurações anteriores de metas não migram automaticamente do Apps Script antigo; devem ser conferidas e reconfiguradas no painel V3.
- A V3 não usa integração direta com a API Google Contacts. O caminho de importação é CSV com prévia. Ela não automatiza envio de mensagens.

## Cenário de aceite executável da V3 LAB

As planilhas fictícias exclusivas da V3 foram ajustadas para refletir a regra de competência sem depender de medalhas específicas. A base Portal LAB agora tem **dois desafios em dezembro/2026** (IDs 9001, 9002) e **um desafio em janeiro/2027** (ID 9003). Há **quatro inscrições de dezembro** (algumas cadastradas em novembro, outras em dezembro) e **uma inscrição de janeiro cadastrada em dezembro**.

O Marketing LAB contém duas REF fictícias ativas, ambas usadas nessas inscrições. O Relacionamento LAB tem quatro contatos fictícios, sendo um proibido de receber contatos. A identificação esportiva contempla ciclismo, corrida/caminhada e ambos.

Quando o **novo** Apps Script V3 estiver implantado, executar no editor:
- `v3_autoteste()` para conferir configurações, integridade de abas e conexões
- `v3_lab_aceite()` para validar **13 cenários funcionais de leitura**, incluindo competência dezembro/janeiro, REF, filtros esportivos, contato marcado não contatar e escolha inválida de desafio

A função de aceite recusa executar em PROD. Ela não grava nenhuma célula. Seu resultado esperado é `status: OK`, `aprovadas: 13`, `total: 13` enquanto a massa de teste mantiver essa configuração.

**Observação:** essa função é uma prova preparada para ser executada dentro do novo Apps Script; até a implantação, a evidência disponível é dos testes Node.js/GitHub Actions, não de uma execução Web real.

## Correções preventivas incluídas na interface

- Respostas antigas de chamadas assíncronas não substituem resultados mais novos após a troca do mês ou dos filtros.
- Alterar o conteúdo CSV invalida a pré-análise; ela deve ser repetida para confirmar importações. Duplicados nunca atualizam cadastro existente automaticamente.
- Botão WhatsApp desabilitado no LAB, durante modo PROD somente leitura, para telefones inválidos e para contatos marcados como não contatar, sem interesse ou contato inadequado.
- Indicadores por competência são independentes da data de abertura da inscrição.
- Índice esportivo mantém cache opcional de 120 segundos, com consulta direta como fallback.

## Auditoria de compatibilidade com a estrutura oficial — 23/11/2026

Conferência de **categorias e contagens agregadas**, sem copiar nomes, telefones ou registros pessoais:

- Marketing PROD: **171 REF válidas, sem duplicações e sem código fora do padrão** permitido na V3.
- Relacionamento PROD: **1.011 contatos** com etapa cadastrada. Etapas verificadas: `PARA_CONTATAR` (709), `AGUARDANDO_RESPOSTA` (212), `NAO_CONTATAR` (40), `FINALIZADO` (25), `EM_CONVERSA` (25).
- Há **um contato com `SEM_INTERESSE`** na coluna `SITUACAO`, além da etapa. A V3 impede que contatos assim apareçam na **fila padrão de abordagem**, sem apagar ou reclassificar os registros; ainda são localizáveis em `Todas`.
- Modalidades explícitas da base: `MTB` e `NAO_INFORMADO`; confirmação `E_CICLISTA=SIM` é respeitada como ciclismo, inclusive quando a inscrição histórica não estabelece modalidade.
- Portal PROD: **64 entradas de desafios com período**, distribuídas em oito competências de `abril/2026` a `novembro/2026`, todas no padrão `mês/ano`. **Nenhum desafio de dezembro constava nessa leitura**. Dezembro aparecerá automaticamente na V3 assim que constar em `ListaDesafios.Periodo`, independentemente do mês de inscrição.

A V3 não renomeia, normaliza em massa ou migra essas informações. A conferência não altera nenhuma planilha real.

## Fila operacional e retornos

- `Para contatar` padrão exclui recusas, contatos inadequados, números explicitamente inválidos, etapa `NAO_CONTATAR` e contatos finalizados, sem mudar a etapa ou situação armazenada.
- `Todas` mantém acesso aos registros para análise administrativa e auditoria.
- Indicadores separados: `Bloqueados para contato` e `Retornar hoje / atrasados`, este último considerando retorno agendado até a data local e excluindo recusas.
- A data de retorno é validada por calendário, inclusive anos bissextos. CSV editado após pré-análise exige nova prévia; o servidor rejeita linhas inválidas.

## Homologação antes da produção

- GitHub Actions executa testes isolados, sem tocar as planilhas, verificando modo LAB/PROD, período de realização, REF, casos de cancelamento, contatos, perfis esportivos, escrita com histórico, importação deduplicada e empacotamento.
- Revisar visualmente as telas em desktop e celular após o deploy V3 LAB; medir tempo real de consulta com aproximadamente mil contatos.
- O Portal Giro que salva novas `REF_MARKETING` e as landing pages têm revisões próprias. O V3 lê o campo, mas uma atribuição ponta a ponta de nova inscrição **depende dessas revisões e do teste Portal LAB**.
- Manter os projetos Apps Script antigos intocados até o usuário aprovar substituição. Sem publicar, os arquivos da PR não modificam o funcionamento atual.

**Status:** código V3 em desenvolvimento/revisão. Não implantado. Não afirmar que está pronto para produção até testes CI e teste visual no novo GAS LAB V3.
