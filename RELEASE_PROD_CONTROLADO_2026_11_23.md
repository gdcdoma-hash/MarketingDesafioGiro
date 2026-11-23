# Publicação controlada — Marketing Giro V2 (23/11/2026)

## Objetivo

Liberar o sistema para **uso real na mesma conta administradora**, sem substituir o Apps Script anterior nem converter o LAB em produção. A interface integrada, as regras de competência mensal, os filtros por desafio e o Relacionamento vêm da PR #52. Este roteiro é para um **novo projeto PROD separado**.

## Pré-condições

- LAB DG-Marketing-LAB-2026 já criado e aprovado no autoteste com 16 verificações; telas Marketing e Relacionamento abertas; acesso externo bloqueado pelo proprietário
- Privilégio **Somente eu** para todos os Web Apps administrativos da nova implantação; não publicar como "qualquer pessoa com o link"
- PR de release testada por GitHub Actions
- Backup da planilha operacional de Marketing e Relacionamento preservado antes de liberar as edições
- Não confundir com o Portal Giro de inscrições: este sistema somente lê as tabelas do Portal. Landing e validação de REF do Portal têm suas próprias PRs

## Processo de implantação de menor risco

1. Criar **outro** projeto Apps Script autônomo, nome sugerido **DG-Marketing-PROD-2026**. Copiar o novo **ID do script**. Não reutilizar o ID do LAB e não editar o projeto GAS anterior que já atende aos usuários.
2. Obter a branch de release `release/marketing-v2-prod-controlado-20261123` em <https://github.com/gdcdoma-hash/MarketingDesafioGiro/tree/release/marketing-v2-prod-controlado-20261123> → **Code → Download ZIP**; extrair em nova pasta (não misturar com o ZIP usado no LAB).
3. No PowerShell da pasta extraída (raiz, contendo `scripts`), utilizar o `clasp` já instalado/autenticado:
   ```powershell
   node .\scripts\preparar-producao.cjs --dry-run
   node .\scripts\preparar-producao.cjs --script-id=ID_DO_NOVO_PROJETO_PROD --confirm-new-production-project=SIM
   ```
4. Entrar **somente na pasta gerada** `build\prod-...`; conferir o `.clasp.json` com o ID novo e executar `clasp push`. O comando de preparação **não faz push nem deploy**. O pacote recusa o ID do LAB e o ID do script anterior.
5. No novo editor Apps Script, criar as **Script Properties**:
   - `DG_AMBIENTE = PROD`
   - `DG_PORTAL_SPREADSHEET_ID = 1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ`
   - `DG_PROD_EDICAO_LIBERADA = NAO` (ou deixar ausente; o bloqueio permanece)
   - A planilha de Marketing PROD é fixa no código: `1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao`. **Não** copie a propriedade `DG_MARKETING_SPREADSHEET_ID` do LAB; no PROD ela é intencionalmente ignorada.
6. Selecionar `dg_prod_autoteste` e **Executar**. Autorizar Google Sheets na conta proprietária se solicitado. Esperado: `status = OK`, `edicaoLiberada = false`; relatório com **10 verificações** e contagens sem dados pessoais. A função não grava dados. Se falhar, **não publicar nem liberar edição**.
7. Nova implantação: **App da Web → Executar como Eu → Quem pode acessar: Somente eu**. Testar o link `/exec` na conta administradora e em janela anônima (deve negar o acesso). Painel Marketing e módulo Relacionamento devem mostrar faixa **PRODUÇÃO — SOMENTE LEITURA**.
8. Conferir números por competência: mês do desafio em `ListaDesafios.Periodo`, inclusive inscrição feita no mês anterior. Comparar com o painel anterior **sem alterar nenhum registro**. Validar seleção de desafios, filtros, REF existentes e contatos.
9. Depois de conferir o backup e os números e autorizar a entrada em uso, alterar **somente** `DG_PROD_EDICAO_LIBERADA = SIM`. Esta opção habilita gravações nos repositórios de Marketing e Relacionamento. Ela independe do mês ou do nome do desafio. Antes de cada importação em lote, realizar pré-análise.
10. Criar um divulgador real de teste **somente se operacionalmente necessário** e autorizado; validar fluxo e conferir registro. As mensagens de WhatsApp continuam manuais. Não criar falsas inscrições no Portal. Atualizar o link administrativo usado pelo proprietário, preservando o anterior para reversão.

## Reversão

- Imediata sem mexer nas planilhas: definir `DG_PROD_EDICAO_LIBERADA = NAO` no novo PROD para bloquear escritas. Se necessário, voltar ao link administrativo anterior.
- Para dados já alterados, recuperar a planilha pelo backup ou histórico de versões, considerando as edições feitas após a cópia.
- Para código, manter PR de release e versão anterior do deployment, sem publicar em contas externas.

## Segurança e limites

- O campo `DG_PROD_EDICAO_LIBERADA` **não** substitui autenticação; o Web App deve permanecer **Somente eu**. O backend valida a trava nos pontos de escrita (metas, divulgadores, contato, importação, origem, agenda e operações estruturais).
- As gravações são na planilha independente de Marketing/Relacionamento. O catálogo e as inscrições do Portal são apenas de leitura neste sistema.
- O LAB usa outras duas planilhas; **não alterar `DG_AMBIENTE` de LAB para PROD** naquele projeto.
- As PRs de landing #190 e de validação do Portal #492 permanecem apartadas; elas são necessárias para atribuição de novas inscrições via REF ponta a ponta, mas não impedem o uso interno de contatos e de relatórios existentes.
- Não está aprovado o uso com múltiplos operadores; isso exige controle de acesso por usuário e revisão de dados pessoais.

## Situação

Código e roteiro preparados no GitHub. A criação do novo Apps Script, autenticação, `clasp push`, execução de `dg_prod_autoteste` e implantação Web dependem da conta proprietária; **não foram realizados por este repositório ou pelo ChatGPT**.
