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

## Criar uma instância V3 em projeto novo

1. Criar um **novo projeto Google Apps Script** para V3. **Não utilizar o projeto antigo nem o LAB V2**, ambos ficam disponíveis.
2. No GitHub baixar esta branch `clean/marketing-relacionamento-v3-20261123` como ZIP e extrair.
3. No PowerShell da pasta raiz do repositório, com Node.js e `clasp` instalados/autenticados:

```powershell
node .\scripts\preparar-v3-limpa.cjs --dry-run
node .\scripts\preparar-v3-limpa.cjs --script-id=ID_DO_NOVO_PROJETO_V3 --confirm-new-project=SIM
```

4. Entrar **somente** na pasta `build\v3-clean-...` retornada, conferir o `.clasp.json` e executar `clasp push`.
5. Configurar as propriedades de LAB no projeto novo, executar `v3_autoteste()`. Esperado: `status=OK`, seis verificações, contagens somente de dados fictícios.
6. **Implantar Web App como Eu / Somente eu**. Confirmar que uma conta diferente não abre o URL.
7. Testar Marketing (mês/desafio/metas) e Relacionamento (etapas, notas, origens, importação fictícia, histórico, bloqueio WhatsApp no LAB).
8. Somente depois, realizar a publicação em **outro Apps Script PROD** separado, começar leitura e liberar edição mediante backup e validação.

O script de empacotamento **rejeita os IDs do LAB anterior e do projeto legado**. Não faz `clasp push` e não cria implantação.

## Proteções e comportamento

- Toda gravação do V3 ocorre **apenas nas abas operacionais** `Marketing` e `Relacionamento_*`. A tabela `dgmbDesafios`, dados pessoais e o catálogo do Portal são sempre consultados, nunca modificados.
- Cadastro e importação não sobrescrevem cadastros existentes. A pré-análise da importação somente lê, informa novos/repetidos/inválidos e limita o lote a 300 registros.
- Campos escritos em Sheets são normalizados para evitar fórmulas vindas de texto ou CSV. As edições de contatos preservam as demais colunas e adicionam eventos no histórico operacional.
- WhatsApp é **manual** e bloqueado no LAB ou em contatos classificados como não contatar. O convite usa o desafio selecionado e sua competência, **sem afirmar que inscrições estão abertas**, e direciona à home oficial com `?ref=...` quando há REF.
- A modalidade do atleta vem preferencialmente da informação declarada, depois da modalidade oficial do desafio e somente então do nome inequívoco no legado. DDD, cidade e grupo de WhatsApp não definem modalidade.
- Contagens das inscrições ignoram cancelamentos, desistências e expirações. Sem REF, REF cadastrada e REF não cadastrada são categorias diferentes. Nenhuma inscrição histórica é atribuída retroativamente.
- Metas são mantidas na Script Property `METAS_MARKETING_V2` do **projeto novo**. Configurações anteriores de metas não migram automaticamente do Apps Script antigo; devem ser conferidas e reconfiguradas no painel V3.
- A V3 não usa integração direta com a API Google Contacts. O caminho de importação é CSV com prévia. Ela não automatiza envio de mensagens.

## Homologação antes da produção

- GitHub Actions executa testes isolados, sem tocar as planilhas, verificando modo LAB/PROD, período de realização, REF, casos de cancelamento, contatos, perfis esportivos, escrita com histórico, importação deduplicada e empacotamento.
- Revisar visualmente as telas em desktop e celular após o deploy V3 LAB; medir tempo real de consulta com aproximadamente mil contatos.
- O Portal Giro que salva novas `REF_MARKETING` e as landing pages têm revisões próprias. O V3 lê o campo, mas uma atribuição ponta a ponta de nova inscrição **depende dessas revisões e do teste Portal LAB**.
- Manter os projetos Apps Script antigos intocados até o usuário aprovar substituição. Sem publicar, os arquivos da PR não modificam o funcionamento atual.

**Status:** código V3 em desenvolvimento/revisão. Não implantado. Não afirmar que está pronto para produção até testes CI e teste visual no novo GAS LAB V3.
