# Reativação independente — Marketing e Relacionamento (23/11/2026)

## Objetivo e limites
Reativar os módulos **Divulgadores** e **Relacionamento** no Apps Script existente, sem migração para o Portal Giro, sem gravação na base oficial de inscritos e sem reescrever Router ou funções de importação.

## Fontes de dados
- **Base operacional (gravação):** planilha `MarketingContatoRelacionamento`, abas `Marketing` e `Relacionamento_*`.
- **Portal (somente leitura):** planilha identificada como `DGMB_PROD_FINAL_20260929_141812`, com `DadosPessoais`, `dgmbDesafios` e `ListaDesafios`.
- **Configuração opcional:** Script Property `DG_PORTAL_SPREADSHEET_ID` substitui a origem de leitura sem tocar a base operacional; se não existir, o código usa a base mais recente identificada.
- Não utilizar a cópia `DadosPessoais` da base operacional como fonte oficial. Consultar sempre a base do Portal.

## Mudanças desta proposta
1. Fonte padrão de consulta atualizada e parametrizada.
2. Painel por **período + ID do desafio**, evitando mesclar Selim e 50 km, inclusive em lançamentos futuros.
3. Desconsiderar estados de cancelamento, desistência e expiração.
4. Diferenciar inscrições sem REF, com REF reconhecida e com REF sem cadastro na tabela Marketing.
5. Manter ranking de cidades pela cidade do **inscrito**, e ranking de divulgadores pela REF da inscrição.
6. Manter o resultado da busca/cadastro de divulgador coerente com o desafio selecionado.

## Referência de auditoria de dados em 23/11/2026
A comparação do Portal com `Marketing` independente identificou:
- Desafio 166 (Selim): 51 inscrições; 45 sem REF; 6 com REF, das quais 2 constam em Marketing e 4 não constam.
- Desafio 167 (50 km): 35 inscrições; 31 sem REF; 4 com REF, das quais 2 constam em Marketing e 2 não constam.
- Inscrição **não é sinônimo de pagamento aprovado**; esta primeira versão exibe registros existentes não cancelados/desistentes/expirados.

**Consequência:** o novo ranking poderá mostrar cidades, mas o ranking de divulgadores não será fiel a toda a campanha enquanto o Portal não preservar a REF nos links de landing, navegação, inscrição e pagamento. Não é correto preencher REF ausentes retroativamente por suposição.

## Verificações e publicação
1. Executar `node tests/marketing_desafios_recorte.test.js`; os testes são simulados e não acessam dados reais.
2. Fazer `clasp status` e inspecionar diferenças contra o projeto GAS atual; criar versão/deployment de testes, sem sobrescrever produção.
3. Confirmar acesso de leitura à planilha do Portal pela conta proprietária do Apps Script; confirmar o Script Property configurado e os IDs corretos.
4. No LAB, selecionar novembro/2026, desafio 166 e 167 separadamente; verificar totais, posições no ranking de cidades e 3 estados de REF. Testar outro período e `Todos os desafios do período`.
5. No Relacionamento, conferir as importações de listas WhatsApp (arquivo CSV/XLSX preparado) e a comparação de Google Contatos; executar análise de `DadosPessoais` e conferir que a escrita acontece apenas em `Relacionamento_*`.
6. Testar a captura de `?ref=<codigo>` passando por landing e cadastro do Portal. Esse fluxo não foi modificado nesta proposta.
7. **Privacidade:** antes de liberar em produção, confirmar que o módulo Contatos/Relacionamento não está acessível a visitantes anônimos; o histórico técnico do projeto já apontou risco quando o Apps Script executa como proprietário para público irrestrito. Não publicar dados pessoais em rota pública.
8. Só após homologação, revisar o PR, sincronizar com `clasp push` e implantar uma nova versão do Web App. Um commit GitHub, por si só, não atualiza o deployment GAS.

## Fora do escopo desta alteração
- Não transfere as abas de Relacionamento ao Portal.
- Não faz disparo automático de mensagens WhatsApp.
- Não altera `DadosPessoais`, `dgmbDesafios`, `ListaDesafios` ou inscrições existentes.
- Não reconstrói contatos ou altera nomes já revisados.
- Não altera a segurança do Router nem o deployment existente; requer verificação antes da publicação.
