# Homologação LAB — Marketing e Relacionamento — 23/11/2026

## Regra geral de competência mensal — obrigatória para qualquer desafio

O sistema **não deve depender de nomes de medalhas, campanhas, nem da data em que a inscrição foi realizada** para determinar o período do painel. Cada inscrição pertence ao mês de realização registrado em `ListaDesafios.Periodo`, identificado pelo `ID_DESAFIO` da inscrição.

Exemplos de regressão: inscrição em novembro/2026 para um desafio com `Periodo = dezembro/2026` deve contar em **dezembro**; inscrição em dezembro/2026 para `Periodo = janeiro/2027` deve contar em **janeiro**. Também é válido inscrever-se durante o próprio mês de realização.

O usuário pode escolher a visão geral do mês ou um desafio específico daquele mês. Metas são salvas por mês de realização e, quando aplicáveis, por ID do desafio, sem usar o mês de abertura para reclassificar inscrições.

A versão multidesafios demonstrada na interface foi preservada em uma PR própria, https://github.com/gdcdoma-hash/MarketingDesafioGiro/pull/51, baseada em `feat/painel-multidesafios`. Ela corrige troca de mês no modal de metas e valida a competência no backend. A PR #51 e esta PR #50 **precisam de integração cuidadosa antes de produção**. Os testes `tests/periodo_competencia_desafio.test.js` nesta PR e `tests/painel_competencia.test.cjs` na PR #51 fixam a mesma regra em ambos os caminhos.

## Escopo e limites

A **PR #50 é de desenvolvimento, não de implantação**. O Google Apps Script de produção e o portal não foram alterados. O acesso às planilhas de produção permanece como era no deployment já existente, mesmo que o manifesto novo declare `MYSELF`.

Há **duas planilhas nativas separadas com dados integralmente fictícios** na pasta:
- Pasta LAB: https://drive.google.com/drive/folders/1RU6dJrNZjtbfXjVxcckZwWGPBiMzT7VE
- Marketing LAB: https://docs.google.com/spreadsheets/d/1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y/edit
- Portal LAB: https://docs.google.com/spreadsheets/d/1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY/edit

A planilha de Marketing LAB tem `Marketing` e as cinco abas `Relacionamento_*` esperadas. A planilha Portal LAB tem `DadosPessoais`, `ListaDesafios`, `dgmbDesafios`. As inscrições simuladas estão marcadas em `9001` (Transmissão) e `9002` (Coração): **são IDs estritamente fictícios**, nunca use em páginas públicas.

## Preparar projeto Apps Script separado

1. Criar um **novo** projeto Apps Script **LAB** na conta responsável pela implantação. **Não reutilizar nem editar o projeto Apps Script da produção**. Verificar que é um projeto distinto (outro `scriptId`).
2. **A PR #50 remove o `.clasp.json` antigo do controle de versão**, e o novo `.gitignore` ignora vínculos e credenciais. Não executar `clasp push` na raiz do repositório. Usar o gerador `scripts/preparar-lab.cjs`: ele aceita apenas um **novo script ID diferente do anterior**, verifica o manifesto de acesso restrito, as duas bases LAB autorizadas, o bloqueio de WhatsApp e a ausência de links de produção. O pacote contém somente `.js`, `.html`, `appsscript.json` e um `.clasp.json` local **somente para o projeto LAB**. Sem ID novo, não há como gerar o pacote.
3. Configurar **Script Properties** no novo projeto:
   - `DG_AMBIENTE = LAB`
   - `DG_MARKETING_SPREADSHEET_ID = 1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y`
   - `DG_PORTAL_SPREADSHEET_ID = 1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY`
4. Implantar o **novo projeto** como Web App `executeAs: USER_DEPLOYING`, `access: MYSELF` (somente proprietário), sem permitir incorporação por sites terceiros. Não tornar público; não criar deploy em produção.
5. Verificar `?area=contatos` (banner amarelo **AMBIENTE LAB**; abrir WhatsApp bloqueado) e `?area=divulgadores`. Verificar que o endpoint administrativo não abre em janela anônima de um usuário não autorizado; o diagnóstico `?diagnostico=acesso` sozinho não valida controle de autorização.
6. Executar primeiro **`dg_lab_autoteste()`** no editor Apps Script **LAB**. Esperado: `status: 'OK'`, 13 verificações aprovadas e totais de 2 referências, 4 contatos, 4 participantes, 4 inscrições e 2 desafios fictícios, sem nomes ou telefones na resposta. O autoteste interrompe se `DG_AMBIENTE` não for `LAB`. Em seguida executar `rel_auditarEstrutura()` (cinco estruturas OK) e, se necessário, `testarConexaoMarketing()` (somente bases LAB). Conferir LAB01 ciclismo, LAB02 caminhada, LAB03 ambos, LAB04 não contatar.
7. Conferir ranking e filtros com referências `LAB_TRANSMISSAO` e `LAB_CORACAO`; verificar a atribuição de inscrições conforme os IDs de desafio fictícios 9001 e 9002. Alterações de etapa, situação, origem ou importação somente na planilha LAB.
8. Para a **REF pública**, a PR https://github.com/gdcdoma-hash/desafiogiro/pull/190 corrige a preservação de `?ref=...` nas landing pages. Ela também é **draft**. O teste unitário passa sem abrir inscrições reais. Uma homologação ponta a ponta com o Portal real requer ambiente de inscrição separado; **não criar inscrição fictícia na planilha de produção**.

## Implantação assistida com o pacote seguro

Em um computador autenticado com a conta que **será proprietária do novo projeto LAB**:

1. Entrar em <https://script.google.com/home/projects/create> e criar um projeto **autônomo** chamado `DG-Marketing-LAB-2026`. Não editar nem duplicar a implantação de produção. Copiar o **ID do script** em **Configurações do projeto → IDs** e conferir que é diferente do ID antigo (início `1kGOdB_gSW...`).
2. Obter a ramificação `fix/reativar-marketing-relacionamento-20261123` de <https://github.com/gdcdoma-hash/MarketingDesafioGiro>. Instalar `Node.js` e o Google `clasp`, entrar em `clasp login` e ativar a API do Apps Script na conta quando solicitado (exigência documentada pelo Google).
3. Na pasta do repositório executar:
   ```powershell
   node scripts/preparar-lab.cjs --dry-run
   node scripts/preparar-lab.cjs --script-id=COLE_AQUI_O_ID_NOVO --confirm-new-lab-project=SIM
   ```
   A saída do segundo comando apresenta uma nova pasta `build/lab-...`.
4. **Apenas dentro dessa pasta nova**, conferir se o ID em `.clasp.json` corresponde ao novo projeto. Executar `clasp push`, sem `--force`. A ferramenta de preparação não faz push nem deploy automaticamente. Nunca executar `clasp push` na raiz do repositório.
5. Configurar as três Script Properties de LAB listadas acima, executar `dg_lab_autoteste()` (esperado `status: 'OK'`) e somente então implantar o Web App **privado** no novo projeto. Não fornecer o endereço a participantes reais.
6. O link de divulgação gerado pelo módulo Marketing permanece **vazio no LAB** para impedir que um botão de cópia aponte ao Portal público. A abertura do WhatsApp também permanece bloqueada. Utilizar exclusivamente os IDs fictícios `9001` e `9002` nas simulações.

**Atenção:** o `clasp push` substitui todos os arquivos do projeto de destino. Por isso a pasta isolada e a conferência do `scriptId` são obrigatórias.

## Bloqueios de segurança

- Sem `DG_AMBIENTE`, qualquer função do novo módulo que abra planilha falha fechada.
- Com `DG_AMBIENTE=LAB`, a configuração só aceita **exatamente** os IDs das duas planilhas fictícias criadas. Rejeita qualquer outra planilha. Não substituir esses IDs por planilhas com cópias de contatos reais.
- No LAB a interface do Relacionamento não abre `wa.me`. O módulo não deve disparar mensagens nem pagamentos.
- No LAB, os links públicos de divulgação são suprimidos no servidor (string vazia), impedindo que um botão de cópia gere convite para inscrição real. O `dg_lab_autoteste()` também verifica esse bloqueio. Testar a montagem de URLs apenas com fixtures.
- Controle de acesso efetivo depende do **deployment criado no Apps Script**, não apenas do manifesto em GitHub. Os métodos remotos são server-side; acesso anônimo na produção histórica precisa ser auditado em sua implantação atual.
- A propriedade `DG_AMBIENTE=PROD` foi tornada explícita e deve ser configurada numa implantação nova somente após revisão operacional.

## Cadeia de atribuição REF — aprovação coordenada

O sistema completo envolve **três revisões independentes**, que não foram mescladas nem publicadas:

1. **Marketing/Relacionamento:** esta PR #50 cria códigos e permite filtrar resultados, sem alterar inscrições anteriores.
2. **Landing pages:** PR #190 em `desafiogiro` preserva `?ref=CODIGO` no link dos CTAs para o Portal, inclusive em fallback. As páginas específicas `/desafios/transmissao/` e `/desafios/coracao/` só devem ser divulgadas depois de publicadas e vinculadas aos desafios reais.
3. **Portal Giro:** PR #492 em `dgmb-inscricoes-repescagem` valida a REF **no servidor**, antes de gravar `dgmbDesafios.REF_MARKETING`. Referências vazias ou malformadas são descartadas sem bloquear a inscrição; fórmulas como `=IMPORTXML(...)` não podem virar código de divulgação.

Até o lançamento das páginas específicas, as mensagens e links genéricos permanecem apontando para a página inicial oficial do Portal Giro. **Não trocar os links para uma landing ainda não publicada.**

Consulta somente leitura à aba `Marketing!A1:A172` em 23/11/2026: **171 referências cadastradas; 168 numéricas, três alfanuméricas; todas atendem ao formato seguro `[A-Za-z0-9_-]{1,100}`**. A validação não exige alterar códigos históricos.

### Evidências e limites

- Teste da landing: GitHub Actions aprovado na PR #190.
- Testes de Marketing: GitHub Actions aprovado nesta PR.
- Código do Portal: três verificações isoladas passaram, cobrindo REF válida, rejeição de valores que poderiam virar fórmula e uso da normalização no campo `REF_MARKETING`.
- A Action da PR #492 registrou **falha na preparação da execução** (sem passos e sem runner associado nas duas tentativas). Por isso **não** considerar a PR #492 homologada por CI até resolver a execução no GitHub.
- Nenhum teste simula o clique e a inscrição real em um deploy privado do Portal. Esse é um **bloqueio de publicação**, não uma etapa concluída.

### Prova final exigida no LAB

Gerar e acompanhar uma inscrição fictícia em um **Portal LAB verdadeiramente separado**, acessando um convite com `?ref=LAB_TRANSMISSAO` ou `?ref=LAB_CORACAO`; conferir o parâmetro no destino, o campo `REF_MARKETING` persistido e os totais por desafio no Marketing LAB. Testar também URL sem REF e REF inválida, confirmando que a inscrição não recebe atribuição indevida. **Não registrar inscrições falsas na produção.**

## Evidências automatizadas

- PR #50: https://github.com/gdcdoma-hash/MarketingDesafioGiro/pull/50
- CI Marketing: ver execução de GitHub Actions do commit HEAD.
- PR #190 landing pages: https://github.com/gdcdoma-hash/desafiogiro/pull/190
- CI landing de REF: https://github.com/gdcdoma-hash/desafiogiro/actions/runs/45173930527

**Estado desta missão:** bases LAB reais (nativas e separadas) criadas e verificadas com dados fictícios; código pronto no GitHub; nenhuma implantação do Apps Script LAB foi feita por falta de ferramenta para criar/configurar projetos Apps Script autenticados. Não marcar como homologação funcional concluída até a execução dentro de um projeto LAB distinto.


## Missão ampliada — integridade de atribuição, segmentação e desempenho (23/11/2026)

### Comportamento conferido no código

- **Filtro inválido não amplia a consulta.** Se um ID de desafio não pertence ao período selecionado, o painel devolve totais zero, \`filtroDesafioInvalido=true\` e aviso visível. A contagem individual por REF também retorna zero. Antes, o painel podia cair silenciosamente em "Todos os desafios".
- **Etapas independentes.** Os testes usam IDs estritamente fictícios \`9001\` e \`9002\` para duas etapas de Transmissão, e \`9003\` para a única etapa de Coração. Inscrições diretas e atribuídas não se cruzam; inscrições canceladas/desistentes não entram no total.
- **Modalidade esportiva.** A ordem de identificação agora é: \`dgmbDesafios.Modalidade_Esportiva\` registrada pelo atleta, depois \`ListaDesafios.Modalidade_Esportiva\` oficial, depois nome inequívoco do desafio histórico. Não deduzir esporte pelo nome do contato, cidade, DDD ou origem de grupo. Telefones partilhados continuam ambíguos sem confirmação manual.
- **Cache opcional, sem custo extra.** O índice esportivo consulta somente a primeira vez e pode ser reutilizado por 120 segundos via \`CacheService\`; usa apenas telefone normalizado e sinais \`ciclismo/corrida/ambiguo\`. Não armazena nomes, CPF ou histórico. Em caso de cache indisponível, corrompido ou maior que o limite, a leitura direta é mantida. O autoteste força dados frescos. **Não foi medida a velocidade no Web App real**.
- **Atribuição exclusiva da visita.** A PR #190 da landing ignora \`ref\` existente na URL configurada do botão quando o visitante não chegou com referência, substitui uma referência antiga pela atual, descarta pares duplicados \`?ref=A&ref=B\` e recusa links que não sejam da origem HTTPS exata do Portal.
- **Redirecionamento inicial.** A PR #190 cobre a home \`https://desafiogiro.gmbd.com.br/?ref=...\` e verifica que a query é encaminhada à URL do Apps Script sem perda de referência. O caminho do domínio antigo também possui cenário de teste, sem autorização para reativar o domínio antigo.
- **Portal backend (PR #492).** \`normalizarRefMarketingInscricao_\` verifica formato antes de gravar \`REF_MARKETING\`, impedindo que fórmula ou parâmetro malformado seja persistido. Sem REF válida, a inscrição continua sem atribuição.

### Evidência de dados oficiais — somente leitura

A aba \`ListaDesafios\` no Portal oficial contém a coluna \`Modalidade_Esportiva\`, preenchida para as medalhas de novembro: Selim com \`CICLISMO\` e 50 km com \`CAMINHADA_CORRIDA\`. Não é necessário copiar dados pessoais para identificar essa modalidade no índice.

A aba \`LandingCampanhas\` do Portal, lida nesta missão, contém somente os slugs publicados/editados \`selim\` e \`50tao\`. **Coração e Transmissão não estavam configuradas ali na leitura.** Não criar ou divulgar \`/desafios/coracao/\` ou \`/desafios/transmissao/\` como páginas já publicadas. O módulo de Relacionamento mantém convites informativos usando a página inicial oficial.

### Testes automatizados do projeto

- Marketing: https://github.com/gdcdoma-hash/MarketingDesafioGiro/actions/runs/45183476328 — **SUCCESS** com testes de filtro inválido, 2+1 etapas, modalidade oficial, cache de 120 segundos, bloqueio LAB e compatibilidade da REF.
- Landing: https://github.com/gdcdoma-hash/desafiogiro/actions/runs/45183070567 — **SUCCESS**, incluindo herança de REF remota, referências duplicadas, origem HTTPS e redirecionamento da home.
- Portal: https://github.com/gdcdoma-hash/dgmb-inscricoes-repescagem/pull/492 — PR **DRAFT**; os testes isolados passam, mas a execução GitHub Actions foi marcada **FAILURE antes de apresentar passos**, impedindo tratá-la como CI aprovado.

### Critérios para ativação de campanha (sem inventar vagas, etapas ou links)

1. Criar um **Apps Script LAB distinto** do script de produção, com os dois IDs das bases fictícias, manifesto proprietário \`MYSELF\` e execução de \`dg_lab_autoteste()\`.
2. Homologar o fluxo de login e inscrição no Portal **LAB**, salvando REF em \`dgmbDesafios\` fictícia; sem registro real de teste.
3. Antes de apresentar inscrição aberta nas páginas, configurar as novas campanhas no módulo Admin do Portal, usando IDs de desafios reais, modalidade correta e quantidade de etapas (Transmissão duas, Coração uma), e validar lotes/vagas com a própria API do Portal.
4. Enquanto a campanha não estiver publicada e sincronizada, a comunicação por WhatsApp deve indicar **preparação da medalha**, não disponibilidade de inscrições.
5. Revisar, testar no LAB e aprovar separadamente as PRs #50, #190 e #492. A implantação deve usar projeto Apps Script LAB distinto; \`clasp push\` nunca na raiz do repositório e nunca com o script antigo.

**Nenhuma dessas três PRs foi mesclada ou aplicada à produção nesta missão.**
