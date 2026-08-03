# Auditoria técnica — dg-SistemaDivulgadores

**Data da análise:** 3 de agosto de 2026<br>
**Escopo:** estado atual versionado neste repositório (`Code.js`, `Index.html`,
`Styles.html`, `Scripts.html` e `appsscript.json`).<br>
**Natureza:** análise estática, sem acesso nem escrita na planilha real e sem
alteração dos arquivos executáveis.

## 1. Sumário executivo

O sistema é um Web App Google Apps Script pequeno, de página única e orientado a
celular. O ponto de entrada `doGet()` entrega um único template. No navegador,
`Scripts.html` solicita ao servidor todos os dados do painel, renderiza as duas
áreas internas (Painel e Divulgadores) e chama três operações remotas: consulta de
pessoas, cadastro de divulgador e mudança de status.

O backend usa uma planilha fixa e quatro abas. Ele cruza `Marketing` com
`DadosPessoais` para descrever origens, `dgmbDesafios` com `ListaDesafios` para
determinar o período, e `REF_MARKETING` com `Marketing.REF` para atribuir
inscrições. Somente `Marketing` é escrita por este projeto.

Não foram encontradas bibliotecas de terceiros, APIs HTTP, gatilhos, cache,
propriedades, criação/reconstrução de abas ou roteamento por URL. Os serviços GAS
usados são `SpreadsheetApp`, `HtmlService` e `Logger`; no cliente, a ponte é
`google.script.run` e a área de transferência usa APIs nativas do navegador.

**Conclusão:** é tecnicamente viável hospedar um segundo módulo no mesmo projeto,
mas não é seguro simplesmente acrescentá-lo ao arquivo e à página atuais. Antes,
é obrigatório definir autorização, contrato de rotas e convenções de nomes. O
risco mais grave já existente é a combinação de implantação anônima, execução
como proprietário e métodos públicos que gravam na planilha sem autenticação ou
autorização própria.

## 2. Limites e método

- Auditoria feita exclusivamente sobre o código versionado; não se confirmou a
  configuração efetiva do deployment, os escopos concedidos, proteções da
  planilha, volume/qualidade dos dados nem cabeçalhos adicionais presentes hoje.
- Não foram executadas funções GAS, pois até as funções de leitura acessariam
  dados reais. Nenhuma planilha foi aberta pela auditoria.
- Não se afirma que rotinas de teste estejam inutilizadas: elas não são chamadas
  pelo Web App, mas podem ser executadas manualmente no editor GAS.
- Achados são classificados por impacto: **CRÍTICO**, **ALTO**, **MÉDIO**,
  **BAIXO** e **OBSERVAÇÃO**.

## 3. Visão geral e mapa de execução

### 3.1 Entrada, rota e carregamento

1. Uma requisição HTTP ao deployment chama `doGet()`; a função não recebe nem
   interpreta `e`, portanto há uma única rota real.
2. `doGet()` avalia `Index`, define título, permite enquadramento por qualquer
   origem (`ALLOWALL`) e adiciona viewport que desabilita zoom.
3. `Index.html` inclui `Styles` no `<head>` e `Scripts` ao final do `<body>` por
   meio de `include()`.
4. Em `DOMContentLoaded`, `carregarDados('')` chama
   `google.script.run.obterDadosPainel('')`.
5. O servidor lê integralmente as quatro abas, calcula métricas e devolve um
   objeto. O cliente guarda esse objeto em `dadosAtuais` e substitui o conteúdo
   de `<main>` por HTML gerado.
6. “Painel” e “Divulgadores” são seções da mesma página, não rotas. A troca é
   exclusivamente por classes CSS.

### 3.2 Contrato front-end/back-end

| Chamada do cliente | Função pública GAS | Efeito |
|---|---|---|
| carga inicial/troca de período | `obterDadosPainel(periodo)` | lê 4 abas e devolve métricas, períodos, origens e dados pessoais associados |
| busca do modal | `buscarPessoasMarketing(termo)` | lê `DadosPessoais`, pesquisa e devolve até 20 pessoas |
| confirmação do cadastro | `salvarDivulgadorMarketing(dados)` | valida e adiciona uma linha em `Marketing` |
| inativar/reativar | `alterarStatusOrigemMarketing(ref, status)` | localiza a primeira REF e altera a célula `STATUS` |

Todos os métodos sem sufixo `_` são globais e invocáveis pelo cliente do Web App;
os auxiliares terminados em `_` são privados pela convenção do Apps Script.
Respostas de mutação usam objetos com `status` (`OK`, `ERRO`, `DUPLICADO` ou
`NAO_ENCONTRADO`) e `mensagem`; exceções seguem para `withFailureHandler`.

## 4. Mapa de arquivos

### `Code.js`

**Responsabilidade.** Todo o backend: configuração fixa, leitura genérica,
métricas, busca, cadastro, status, HTML e rotinas manuais de diagnóstico.

**Elementos principais.** `SPREADSHEET_ID`, `ABAS`, `META_MARKETING` e
`PORTAL_INSCRICAO_URL`; `doGet()`/`include()`; `obterDadosPainel()`;
`buscarPessoasMarketing()`; `salvarDivulgadorMarketing()`;
`alterarStatusOrigemMarketing()`; auxiliares `lerAbaComoObjetos_()`,
`extrairIdDesafio_()`, `chavePeriodo_()` e `normalizarBuscaMarketing_()`; testes
manuais `testarConexaoMarketing()`, `testarMetricasMarketing()` e
`diagnosticarPeriodoMarketing()`.

**Dependências.** Quatro abas e seus cabeçalhos, serviços GAS, URL fixa do Portal
Giro e os nomes de template `Index`, `Styles` e `Scripts`.

**Riscos.** Backend monolítico e global; `obterDadosPainel()` concentra acesso,
junções, regras, agregação e DTO; há lógica de métricas duplicada na rotina manual
`testarMetricasMarketing()` e ela não exclui cancelados como o painel; constantes
de infraestrutura e negócio vivem no código; cadastro escreve por posição fixa;
não há autorização, lock, cache ou camada de acesso a dados.

### `Index.html`

**Responsabilidade.** Casca da página, cabeçalho, `<main>` dinâmico, botão
flutuante e dois modais: configurações e cadastro em etapas.

**Dependências.** `include()`, IDs/classes esperados por Scripts/Styles e handlers
globais usados em atributos `onclick`.

**Riscos.** Forte contrato implícito por IDs; marcação do fluxo de cadastro tem
quatro etapas no mesmo modal e ordem não intuitiva no arquivo; há viewport no
HTML e outro adicionado por `doGet()` com regras diferentes; botões com `onclick`
exigem funções globais e aumentam chance de colisão com outro módulo.

### `Scripts.html`

**Responsabilidade.** Estado, RPC, renderização, filtros, navegação, clipboard,
mensagens e fluxo completo do modal.

**Dependências.** DOM específico de `Index`, formato integral dos DTOs do backend,
`google.script.run`, `navigator.clipboard`, `document.execCommand`, `window.alert`,
`window.confirm` e `window.prompt`.

**Riscos.** Todas as funções e os estados `dadosAtuais`,
`filtroDivulgadoresAtual` e `novoDivulgadorAtual` são globais; grande quantidade de
HTML é montada por strings; uma recarga substitui todo o `<main>` e volta à aba
Painel; filtros de status são somente locais; resultados (incluindo WhatsApp) são
serializados em `data-resultados`; não existe cancelamento/ordenação de respostas
assíncronas nem debounce de busca.

### `Styles.html`

**Responsabilidade.** CSS completo, tokens básicos, cartões, navegação, métricas,
botões, estados, modais, busca e breakpoints.

**Dependências.** Classes geradas pelo HTML estático e por `Scripts.html`.

**Riscos.** Folha única e global, sem prefixo de módulo; seletores elementares
como `button` e `select` atingiriam futuras telas; regras de desktop são limitadas
a duas colunas e largura máxima de 760 px. É coerente com o requisito mobile-first,
mas não deve virar a folha global do futuro módulo de PC sem isolamento.

### `appsscript.json`

**Responsabilidade.** Manifesto V8, fuso de São Paulo, Stackdriver e deployment.

**Dependências/riscos.** Sem dependências declaradas. O Web App está configurado
como `ANYONE_ANONYMOUS` e `USER_DEPLOYING`, combinação que expõe operações com a
autoridade do implantador. O manifesto não declara escopos explícitos; eles são
inferidos pelo GAS.

### `AGENTS.md`

Documento de contexto e regras de manutenção. Não participa da execução. Registra
o propósito restrito do projeto, o contrato atual da planilha e a separação dos
quatro arquivos funcionais.

## 5. Mapa de dados

`lerAbaComoObjetos_()` usa a primeira linha como cabeçalho, remove espaços das
extremidades, ignora linhas totalmente vazias e retorna valores de exibição como
strings. Cabeçalhos vazios são ignorados; cabeçalhos repetidos sobrescrevem a
propriedade anterior silenciosamente. A maioria das regras usa nomes de cabeçalho,
mas o `appendRow` do cadastro pressupõe ordem fixa.

### 5.1 `Marketing`

| Item | Detalhe |
|---|---|
| Finalidade | cadastro de divulgadores/origens |
| Cabeçalhos esperados | `REF`, `ID_DGMB`, `NOME_ORIGEM`, `TIPO`, `STATUS` |
| Leituras | testes manuais, `obterDadosPainel`, `salvarDivulgadorMarketing`; `alterarStatusOrigemMarketing` lê diretamente o range |
| Escritas | `salvarDivulgadorMarketing` adiciona linha; `alterarStatusOrigemMarketing` altera `STATUS` |
| Identificador | `REF` é a chave de atribuição; no cadastro de pessoa, `REF = ID_DGMB` |
| Duplicidade | bloqueia se qualquer linha tiver `REF == idDgmb` **ou** `ID_DGMB == idDgmb`, comparação exata após `trim` |
| Status | novo registro nasce `ATIVO`; servidor aceita apenas `ATIVO`/`INATIVO` em alteração |

`NOME_ORIGEM` é fallback para origens sem pessoa correspondente. Quando existe
`ID_DGMB`, nome/cidade/WhatsApp vêm de `DadosPessoais`. O cadastro via tela aceita
somente pessoas existentes, deixa `NOME_ORIGEM` vazio e escreve exatamente cinco
valores na ordem documentada. Origens não pessoais já existentes continuam
legíveis, mas não podem ser criadas por esta interface.

### 5.2 `DadosPessoais`

| Item | Detalhe |
|---|---|
| Finalidade | cadastro mestre de participantes e enriquecimento de nomes/localização |
| Cabeçalhos usados | `ID_DGMB`, `nome`, `Cidade-UF`, `whatsapp` |
| Leituras | testes, métricas, painel, busca e validação do cadastro |
| Escritas | nenhuma |
| Identificador | `ID_DGMB`; mapas por ID mantêm a última linha duplicada, enquanto cadastro usa a primeira encontrada |

A busca normaliza caixa e acentos, aceita ID exato/parcial e nome parcial, ordena
ID exato primeiro e limita a 20. Não pesquisa cidade. Ela devolve WhatsApp ao
navegador, embora a listagem principal não o exiba.

### 5.3 `dgmbDesafios`

| Item | Detalhe |
|---|---|
| Finalidade | fonte das inscrições |
| Cabeçalhos usados | `ID_DGMB`, `Observacao`, `REF_MARKETING`; opcionalmente `Status_Usuario_Desafio` e `Status_Desafio` |
| Leituras | testes, diagnóstico e painel |
| Escritas | nenhuma |
| Chaves | `REF_MARKETING` relaciona com `Marketing.REF`; token `[ID_DESAFIO:n]` em `Observacao` relaciona com `ListaDesafios.id_Desafio_lista`; `ID_DGMB` relaciona participante inscrito a `DadosPessoais` |

Uma linha cujo status contenha `CANCEL` (sem diferenciar caixa) é descartada no
painel. Inscrições sem REF são diretas. REF preenchida, mesmo não cadastrada em
`Marketing`, conta como atribuída e como `NAO_CLASSIFICADO`, mas não incrementa um
divulgador. Sem token válido ou sem correspondência na lista, a inscrição não
entra em nenhum período selecionável. A rotina manual antiga usa `SEM_PERIODO` e
não aplica cancelamento, portanto serve apenas como diagnóstico independente.

### 5.4 `ListaDesafios`

| Item | Detalhe |
|---|---|
| Finalidade | mapear desafio para período e fornecer a lista de períodos |
| Cabeçalhos usados | `id_Desafio_lista`, `Periodo` |
| Leituras | testes, diagnóstico e painel |
| Escritas | nenhuma |
| Identificador | `id_Desafio_lista`; em duplicidade, a última linha prevalece no mapa |

Períodos aceitos para ordenação têm formato `mês/AAAA` (nome em português ou
número). Formatos inválidos continuam na lista, mas recebem chave zero. O período
mais recente ordenado é o padrão.

### 5.5 Dependências e ciclo de vida

Não há integridade referencial imposta. Todas as relações são junções em memória
por strings após `trim`. Nenhuma aba é criada, reparada, reconstruída ou migrada;
aba ausente normalmente lança erro na leitura, salvo retornos controlados nas
duas mutações. Não há exclusão de registros.

## 6. Fluxos atuais

### 6.1 Consultar o painel

1. A página carrega o período mais recente de `ListaDesafios`.
2. O servidor indexa pessoas e períodos, cria uma origem para cada REF de
   `Marketing` e percorre todas as inscrições não canceladas.
3. Calcula total do período, atribuídas, diretas, meta fixa 200, top 10 de origens,
   métricas por tipo/cidade/UF e total histórico por origem.
4. A tela mostra cartões de meta/resumo e abre “Painel”; o seletor de período fica
   no modal de configurações. Aplicar outro período relê as quatro abas.

O `totalHistorico` inclui inscrições não canceladas com REF cadastrada em todos os
períodos, inclusive sem período reconhecido. O ranking e `inscricoes` usam somente
o período selecionado. Status do divulgador não interfere na atribuição histórica
nem no ranking.

### 6.2 Listar, filtrar e copiar link

1. A aba interna “Divulgadores” recebe todas as origens de `Marketing`.
2. O filtro inicial é `ATIVO`; `INATIVO` e `TODOS` são filtros exclusivamente no
   array já carregado, com comparação exata após uppercase.
3. Cada ativo mostra `COPIAR LINK`; inativos não mostram esse botão.
4. O link é a URL fixa do Portal mais `?ref=` e a REF codificada. A cópia tenta
   Clipboard API, depois `execCommand('copy')` e finalmente prompt manual.

Não há pesquisa da listagem por código, nome ou cidade. A única pesquisa por nome
ou código pertence ao fluxo de novo cadastro; cidade aparece no resultado, mas
não é critério. Período filtra métricas, não o conjunto cadastral.

### 6.3 Cadastrar divulgador

1. O botão `+` abre o modal; usuário pesquisa nome ou código.
2. O servidor lê toda `DadosPessoais`, devolve no máximo 20 resultados e o usuário
   seleciona uma pessoa (seleção automática se houver um único resultado).
3. A tela mostra nome, cidade e WhatsApp; o usuário escolhe `PARTICIPANTE`,
   `ADMIN`, `APOIADOR` ou `GRUPO`, passa por uma segunda confirmação e envia ID/tipo.
4. O servidor repete validações: ID obrigatório, tipo permitido, existência da
   pessoa e ausência de duplicidade em `Marketing`.
5. Adiciona `[id, id, '', tipo, 'ATIVO']`. Assim, a REF não é gerada aleatoriamente:
   é exatamente o `ID_DGMB`.
6. Retorna link, exibe sucesso e recarrega integralmente o painel.

Não existe permissão por perfil. A confirmação no navegador é experiência de uso,
não controle de segurança; qualquer cliente capaz de chamar o método público pode
enviar o payload diretamente.

### 6.4 Inativar e reativar

1. Ativo exige `window.confirm`; reativação não exige confirmação.
2. O servidor valida REF e enum de status, acha os cabeçalhos e a primeira linha
   de REF exata, então altera somente a célula STATUS.
3. Em sucesso, o cliente modifica o objeto local e refiltra, sem reler a planilha.

Inativação não invalida links já copiados, não impede o Portal de gravar a REF e
não exclui resultados. Ela apenas muda a apresentação/listagem e oculta o botão de
cópia quando o registro é exibido como inativo.

## 7. Interface e experiência operacional

- **Estrutura:** cabeçalho, período, conteúdo refeito dinamicamente, navegação
  sticky com duas abas, botão flutuante, modal de período e modal de cadastro.
- **Tabelas:** não há tabelas HTML; rankings, métricas e divulgadores são cartões e
  listas, adequados a celular, potencialmente longos no desktop.
- **Mensagens:** carga/erro/vazio no conteúdo; mensagens inline no modal; alerts
  para status; estados de botão “BUSCANDO/SALVANDO”; sucesso de clipboard temporário.
- **Atualização:** troca de período e cadastro recarregam tudo; status atualiza
  localmente. Não há refresh manual, paginação, carregamento incremental ou
  indicador global que preserve o conteúdo anterior.
- **Desktop:** centralizado em 760 px, resumos e métricas em duas colunas acima de
  700 px; modal centralizado. Funciona, mas não explora telas largas.
- **Celular:** controles grandes, safe areas, cartões em coluna, modal tipo bottom
  sheet e botão fixo. O servidor também injeta `user-scalable=no`, prejudicando
  usuários que dependem de zoom. A página possui dois metatags viewport.
- **Navegação:** modais não implementam fechamento por Escape/clique externo,
  foco preso ou restauração de foco; troca/recarga retorna visualmente ao Painel;
  a aba atual não está em URL/histórico.
- **Carga:** cada refresh espera quatro leituras completas antes de mostrar
  qualquer dado; a interface não separa falha parcial e não protege contra
  respostas assíncronas fora de ordem.

## 8. Segurança e integridade

### CRÍTICO — Web App anônimo com escrita como implantador

O manifesto permite acesso anônimo e executa com a identidade de quem implantou.
Não há verificação de sessão, e-mail, token, papel ou allowlist nas funções de
cadastro/status. Um visitante pode, em princípio, consultar dados pessoais e
invocar mutações com a autoridade do proprietário. Antes de qualquer expansão,
é indispensável decidir e testar um modelo de acesso compatível com os usuários.
Não se recomenda mudar o deployment nesta auditoria, pois isso exige validação
operacional e foi explicitamente vedado no escopo.

### ALTO — Exposição de dados pessoais

O painel devolve nome, cidade e WhatsApp de todos os divulgadores; a pesquisa
anônima permite procurar `DadosPessoais` e retorna WhatsApp de até 20 pessoas por
chamada. Mesmo campos não exibidos permanecem acessíveis no objeto do navegador.
O mínimo privilégio não está aplicado.

### ALTO — Corrida entre validação e gravação

O cadastro lê para detectar duplicidade e depois usa `appendRow`, sem
`LockService`. Duas chamadas simultâneas podem ambas passar na validação e criar
duplicatas. Atualizações simultâneas também são “última gravação vence”; se já
existirem REFs duplicadas, somente a primeira linha é alterada.

### ALTO — Cabeçalhos versus gravação posicional

Embora leituras e alteração de status descubram colunas por cabeçalho, o cadastro
escreve cinco posições fixas. Reordenar/adicionar coluna no meio pode deslocar ou
sobrescrever semanticamente dados. Não há validação do conjunto/ordem antes do
append.

### MÉDIO — Clickjacking e enquadramento irrestrito

`ALLOWALL` permite incorporar o Web App em qualquer site. Somado à ausência de
autorização e às ações de escrita, isso amplia risco de indução de cliques. A
necessidade funcional do iframe não está documentada.

### MÉDIO — Validação e contrato de dados incompletos

Há boas validações server-side de ID, existência, tipo, REF e status. Porém não há
limite de tamanho de entrada, validação formal de ID, normalização de REF/case,
validação central dos cabeçalhos para todas as operações, nem checagem de
unicidade da base. O período solicitado aceita qualquer string (resultado natural
é painel vazio). Tipos de cadastro não incluem `CANAL_PROPRIO`, embora o contexto
do projeto reconheça esse tipo para origens existentes.

### MÉDIO — HTML/JavaScript dinâmico

Textos visíveis passam por `esc()`, e valores interpolados em `onclick` passam por
`escJs()`. Esta última protege barra, aspas simples e quebras, mas não é um encoder
completo para contexto HTML + JavaScript (por exemplo, não neutraliza `<`, `&` ou
separadores Unicode). Preferir listeners e `dataset` evitaria contexto executável;
qualquer mudança deve ser localizada e testada, não uma refatoração ampla.

### BAIXO — Tratamento de erros e observabilidade

Falhas de RPC produzem mensagens genéricas e `console.error`; não há logging
estruturado/auditoria de quem alterou o quê. Algumas funções retornam erro e outras
lançam exceção. A configuração Stackdriver ajuda exceções, mas não substitui trilha
de mutações. Rotinas manuais imprimem dados pessoais no log.

### OBSERVAÇÃO — Cache e criação automática

Não há `CacheService`, `LockService`, `PropertiesService`, sanitização em planilha
contra fórmulas, nem criação/reconstrução de abas. A entrada escrita (ID e tipo) é
validada a partir de valores já existentes/enum; ainda assim, fórmulas que já
existam em IDs seriam copiadas como texto iniciado por `=` via `appendRow`, assunto
a validar conforme a qualidade da base.

## 9. Desempenho e escalabilidade

### ALTO — Leituras integrais repetidas

Toda carga do painel executa quatro `getDataRange().getDisplayValues()` e transfere
todos os registros para memória. Trocar período repete exatamente as leituras,
apesar de Marketing/Pessoas/Lista mudarem menos. Cadastro ainda lê integralmente
DadosPessoais e Marketing; busca lê DadosPessoais a cada clique.

### MÉDIO — Payload acima do necessário

O painel devolve todos os divulgadores com WhatsApp e links, além de rankings e
agregações. O navegador filtra status, mas o servidor já percorreu tudo. Com base
grande, serialização e transferência se tornam relevantes e expõem mais dados do
que a tela usa.

### MÉDIO — Busca linear sem debounce/paginação

Cada busca normaliza e examina toda a aba, ordena correspondências antes de
limitar 20 e depende de clique (não dispara por tecla no código observado). Não há
índice/cache. O custo cresce linearmente e chamadas repetidas concorrem por quota.

### MÉDIO — Função agregadora extensa

`obterDadosPainel()` faz quatro leituras, três índices, diversas agregações e
ordenações em uma única chamada. O desenho reduz round-trips do cliente, o que é
positivo hoje, mas torna impossível cachear/instrumentar partes isoladamente.

### BAIXO — Escritas

Cadastro usa uma única `appendRow` e status uma única `setValue`; não há gravação
linha a linha em loops. Isso é eficiente para uma ação, embora falte lock e o
append posicional seja frágil.

### OBSERVAÇÃO — Cliente

A renderização troca todo o `<main>` via `innerHTML`. Para a escala atual é
simples e aceitável; com centenas/milhares de divulgadores produzirá DOM grande.
Filtro local é instantâneo após a carga, mas não reduz a carga inicial.

## 10. Arquitetura e manutenibilidade

### Acoplamento e globais

O backend está concentrado em um arquivo e namespace global GAS. No cliente,
estado e handlers também são globais, unidos por IDs de DOM e `onclick`. CSS é
global. Esse arranjo é simples e adequado a um módulo pequeno, mas um segundo
módulo com nomes genéricos (`renderizar`, `carregarDados`, `.app`, `.hidden`,
`.btn-principal`) pode sobrescrever comportamento ou estilo.

### Duplicação e tamanho

Não há duplicatas exatas evidentes, mas `testarMetricasMarketing()` mantém uma
segunda implementação parcial das junções/métricas, já divergente em cancelamento
e período ausente. `obterDadosPainel()` e `renderizar()` são as funções mais
abrangentes. Fragmentá-las agora, sem testes automatizados, contraria a preservação
de comportamento; o risco deve ser documentado e contido nas novas adições.

### Pontos a preservar

- Relação `REF_MARKETING` → `Marketing.REF` e REF pessoal igual a `ID_DGMB`.
- Extração do desafio de `[ID_DESAFIO:n]` e mapeamento por `ListaDesafios`.
- Exclusão de inscrições explicitamente canceladas no painel.
- Leitura por cabeçalho, enriquecimento por `DadosPessoais`, histórico independente
  do status e filtros ATIVO/INATIVO/TODOS.
- URL do Portal, meta, IDs, nomes de abas/cabeçalhos e contrato mobile atual até
  haver missão e testes específicos para alterá-los.

## 11. Viabilidade de um segundo módulo

**Viável, com separação explícita.** Um deployment GAS pode servir páginas
diferentes e métodos independentes, mas hoje `doGet()` ignora rota e entrega uma
SPA única. O segundo módulo não deve ser inserido dentro de `Scripts.html`,
`Styles.html` ou `obterDadosPainel()` existentes.

### Riscos e conflitos prováveis

1. colisão de funções/constantes globais GAS e handlers/estado globais no browser;
2. vazamento de CSS genérico entre interfaces mobile e desktop;
3. `doGet()` único sem validação/allowlist de rota;
4. ampliação da superfície anônima e do acesso a dados de relacionamento;
5. compartilhamento acidental da planilha/abas e regras de divulgadores;
6. maior tempo/quota se o novo módulo reutilizar a carga integral atual;
7. implantação única acopla releases e rollback dos dois módulos.

### Separações necessárias (sem implementar agora)

- Definir rotas estáveis e explícitas, por exemplo um parâmetro `area` com
  allowlist e fallback que preserve exatamente a página atual. A URL atual sem
  parâmetro deve continuar abrindo Divulgadores.
- Criar arquivos próprios do futuro módulo (backend, template, CSS e JS) com
  prefixo inequívoco, e funções RPC igualmente prefixadas.
- Encapsular JavaScript futuro em IIFE/módulo e usar classes CSS sob um contêiner
  raiz próprio; não carregar ativos de uma área na outra.
- Criar camada de dados futura que use apenas abas próprias. Compartilhar somente
  utilitários puros e comprovadamente genéricos; não reutilizar funções de
  marketing por conveniência.
- Definir autorização no servidor antes de expor contatos. Rotear interface não é
  autorização; toda RPC sensível precisa validar acesso.
- Definir testes de regressão do módulo atual antes de alterar `doGet`, `include`
  ou manifesto.

Uma divisão em “rotas, serviços, repositórios e interfaces” é possível, mas não é
necessário reestruturar integralmente o módulo legado. A abordagem de menor risco
é tratá-lo como compatibilidade congelada e aplicar organização estrita aos novos
arquivos; extrair código legado apenas quando um teste provar equivalência e uma
necessidade concreta justificar.

## 12. Diagnóstico consolidado

| Severidade | Achado | Consequência |
|---|---|---|
| **CRÍTICO** | acesso anônimo + execução como implantador + RPCs sem autorização | leitura de dados pessoais e escrita indevida em `Marketing` |
| **ALTO** | busca/painel expõem dados pessoais, inclusive WhatsApp | quebra de mínimo privilégio e risco de privacidade |
| **ALTO** | cadastro sem `LockService` | duplicatas em chamadas concorrentes |
| **ALTO** | `appendRow` por posição fixa | corrupção semântica se ordem de colunas mudar |
| **ALTO** | quatro leituras integrais em toda carga | tempo/quota crescentes |
| **MÉDIO** | `ALLOWALL` | clickjacking/embutimento não controlado |
| **MÉDIO** | namespaces JS/CSS/GAS globais | colisões ao adicionar módulo |
| **MÉDIO** | ausência de rota e autorização por área | acoplamento e exposição futura |
| **MÉDIO** | métrica desconhecida conta como atribuída, mas sem divulgador | totais podem não reconciliar visualmente com ranking |
| **MÉDIO** | inscrições sem período mapeado somem do período | subcontagem silenciosa do painel selecionado |
| **MÉDIO** | validações/encoding incompletos | entradas anômalas e risco de contexto HTML/JS |
| **MÉDIO** | rotinas de métrica principal e teste divergentes | diagnóstico manual pode discordar da tela |
| **BAIXO** | mensagens genéricas e sem trilha de mutação | suporte e auditoria operacional difíceis |
| **BAIXO** | acessibilidade de modal/zoom | navegação por teclado e ampliação prejudicadas |
| **BAIXO** | recarga integral perde aba visual | atrito operacional |
| **OBSERVAÇÃO** | sem bibliotecas, gatilhos, cache ou criação de abas | baixa complexidade, mas sem otimizações/recuperação automática |

## 13. Recomendações priorizadas

### 13.1 Obrigatório antes do segundo módulo

1. **Definir e validar autorização.** Inventariar quem deve acessar cada área,
   revisar deployment efetivo e impedir RPC anônima sensível no servidor. Para
   contatos/relacionamento, não expor nenhum dado antes disso.
2. **Criar contrato de rotas com compatibilidade.** Documentar rota padrão atual,
   allowlist e comportamento para rota inválida; testar URL existente antes/depois.
3. **Adotar convenção de namespace.** Prefixos diferentes no GAS, encapsulamento
   no cliente e raiz CSS por módulo; novos arquivos separados.
4. **Isolar dados.** Abas/repositório do segundo módulo próprios, sem modificar as
   quatro abas nem o fluxo atual.
5. **Criar baseline de regressão.** Casos documentados com fixtures não reais para
   métricas (direto, REF válida/desconhecida, cancelado, sem período, status),
   cadastro, duplicidade, busca e status.
6. **Corrigir concorrência antes de ampliar escrita.** Em missão própria, envolver
   validação + append em lock e descobrir colunas por cabeçalho, mantendo o mesmo
   resultado funcional.
7. **Minimizar dados retornados.** Definir quais campos cada tela realmente pode
   receber; especialmente, não reutilizar a busca anônima atual para contatos.

### 13.2 Recomendável, mas pode esperar

1. Medir tempos, tamanhos e quotas com dados anonimizados; só então introduzir
   cache de índices/leituras estáveis com invalidação clara.
2. Centralizar validação de cabeçalhos e retornar erros consistentes.
3. Instrumentar mutações com registro seguro de ator, horário, ação e resultado,
   sem gravar dados pessoais desnecessários em logs.
4. Remover interpolação em `onclick` em mudanças localizadas, usando listeners e
   atributos de dados seguros.
5. Tratar ausência/duplicidade de chaves e período não mapeado com diagnóstico
   administrativo, sem mudar silenciosamente as métricas.
6. Revisar necessidade de `ALLOWALL` e de bloquear zoom em missão de segurança/
   acessibilidade aprovada.

### 13.3 Evolução futura

1. Paginação/busca server-side indexada quando volumes justificarem.
2. Serviços/repositórios por módulo e utilitários puros compartilhados somente
   após repetição real, não antecipadamente.
3. Testes automatizados de regras puras extraídas com fixtures, mais smoke test do
   template e contrato RPC.
4. Layout desktop próprio para o futuro módulo, sem alterar o mobile atual.
5. Estratégia explícita de versionamento, release e rollback para duas áreas no
   mesmo deployment.

### 13.4 Não mexer neste momento

- Não alterar IDs, URLs, deployment, planilha, abas, cabeçalhos ou meta.
- Não renomear funções/arquivos atuais nem fazer refatoração ampla preventiva.
- Não remover as rotinas manuais apenas por não serem chamadas pelo Web App.
- Não mudar regras de cancelamento, atribuição, período, status ou histórico sem
  especificação funcional e amostra validada.
- Não criar o módulo de contatos, novas abas ou dependências nesta auditoria.
- Não “otimizar” com cache antes de medir e definir invalidação.

## 14. Checklist rastreável para decisão futura

- [ ] Deployment efetivo e perfis de acesso foram verificados fora do código.
- [ ] Campos pessoais permitidos por área foram aprovados.
- [ ] Rotas e fallback compatível foram especificados.
- [ ] Convenções de nomes GAS/JS/CSS foram registradas.
- [ ] Abas do futuro módulo foram desenhadas sem tocar nas atuais.
- [ ] Fixtures e resultados esperados do módulo atual foram aprovados.
- [ ] Concorrência e gravação por cabeçalho receberam missão isolada.
- [ ] Métricas de tempo, volume e quotas foram coletadas.
- [ ] Plano de implantação/rollback conjunto foi definido.

Até esses itens serem tratados, a recomendação é manter os arquivos executáveis
inalterados — exatamente como feito por esta auditoria.
