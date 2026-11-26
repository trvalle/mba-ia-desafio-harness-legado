# Estado do desafio Balcão

## Identificação e versão

- Projeto: Balcão — domando um legado para agentes.
- Repositório local: `F:\MBA\domando um legado para agentes\mba-ia-desafio-harness-legado`.
- Commit inicial: `e515681` (`commit inicial`).
- Branch inicial: `main`; árvore limpa na inspeção inicial, conforme registro do agente principal.
- HEAD observado nesta revisão: `e515681`.
- Estado atual: implementação em andamento, com alterações ainda não commitadas.
- Destino exigido: fork público do repositório base, com entrega final na `main`; URL, visibilidade e commit remoto final ainda precisam de comprovação.
- Matriz: [requisitos.json](requisitos.json).

## Fase e responsabilidades

A leitura integral dos dois anexos e a revisão independente dos requisitos foram concluídas. O agente principal trabalha no harness e ambiente; agentes de gates e refatoração trabalham em paralelo no mesmo checkout. Este agente cuida somente de `docs/requisitos.json` e `docs/estado.md` nesta etapa.

Não foram usadas worktrees para o desenvolvimento paralelo nesta etapa. Isso não constitui exigência acadêmica: o requisito é demonstrar duas worktrees da aplicação em execução simultânea e isolada. Essa demonstração permanece pendente.

## Baseline observado

Os fatos abaixo foram informados pelo agente principal. O commit inicial também foi confirmado por leitura do Git nesta revisão. Logs e screenshots ainda precisam ser vinculados a caminhos versionados ou artefatos identificáveis. Nenhum resultado abaixo comprova a implementação que está sendo alterada.

| Registro | Fato | Resultado e limite |
|---|---|---|
| B01 | Commit inicial e515681, main e checkout inicialmente limpo | Referência inicial; checkout atual contém alterações de implementação |
| B02 | README original executado em WSL Ubuntu 24.04, Node 24.22.3 e Docker Desktop via docker.exe | Execução inicial registrada pelo agente principal |
| B03 | Primeira seed falhou porque Prisma Client não estava gerado; npx prisma generate resolveu | Falha e recuperação reais; falta comprovar prevenção automática na subida |
| B04 | 33 testes unitários passaram | Resultado do baseline; reexecutar após refatoração |
| B05 | Segunda seed falhou com P2002 no e-mail | Idempotência reprovada no baseline; correção e nova prova pendentes |
| B06 | Blackbox original: 50 de 51 passaram; houve timeout isolado de triagem embora worker tenha registrado triado | Baseline reprovado; investigar causa e timing do host, sem descartar a falha |
| B07 | API health respondeu e front retornou HTTP 200 | Disponibilidade básica; não comprova login, upload ou jornada completa no navegador |

## Conformidade comprovada nesta matriz

- Requisitos acadêmicos obrigatórios: 39.
- Requisitos complementares obrigatórios: 17.
- Total de itens rastreáveis: 56.
- Aprovados: 0; reprovados na versão final: 0; bloqueados formalmente: 0; pendentes: 56.
- Conformidade acadêmica comprovada: 0/39 (0%).
- Conformidade complementar comprovada: 0/17 (0%).
- Esses percentuais medem evidências finais vinculadas, não esforço realizado nem qualidade estimada.
- Não há veredito final. O baseline com falhas não deve ser apresentado como aprovação.
- As contagens devem ser recalculadas a partir da matriz quando ela for atualizada.

## Decisões e restrições

- O enunciado prevalece sobre orientações genéricas do prompt complementar.
- Preservar contrato HTTP, contas da seed, fake por padrão sem chave, stack e entradas fixas.
- O worker deve continuar como processo separado da API.
- Desenvolver no WSL e evitar pré-requisitos não disponíveis no Linux/macOS do avaliador.
- Não alterar blackbox oficial para obter aprovação; executar cópia separada do upstream nas duas instâncias.
- Não excluir arquivos de src dos gates nem adicionar supressões.
- Registrar incidentes reais e commits preventivos do harness; falhas herdadas não devem ser falsamente atribuídas ao agente.
- O relatório HTML é material complementar obrigatório do pedido do aluno; sua avaliação deve ser separada da conformidade acadêmica.
- Não há exigência de CI, deploy, PRs ou concorrência entre workers no mesmo banco.

## Pendências prioritárias

1. Concluir implementação do ambiente, gates e refatorações, preservando contratos.
2. Investigar e resolver ou caracterizar com evidência o timeout de triagem observado no baseline.
3. Verificar subida idempotente, seed completa sem duplicações, seleção/isolamento de recursos e encerramento.
4. Rodar unitários e gates na implementação final; corrigir todas as violações legítimas.
5. Registrar pelo menos três incidentes reais com mudança preventiva no harness e hashes existentes.
6. Confirmar baseline verde e Git limpo antes do kit-gates; executar kit completo e mutações independentes.
7. Validar clone limpo e os 11 passos oficiais, incluindo duas worktrees, front real, anexos, triagem em até 15 segundos, blackbox oficial nas duas e hook.
8. Completar AGENTS, redirecionamento CLAUDE, README e evidências por requisito.
9. Realizar auditoria independente sem alterações durante a avaliação; corrigir e reavaliar achados.
10. Criar e validar docs/relatorio-final.html com dados reais, matriz, screenshots e instruções didáticas.
11. Revalidar verificações afetadas pela documentação final; conferir Git, branch, commit e destino público.
12. Entregar veredito comprovado e instruções de submissão, sem enviar ao professor.

## Riscos e questões abertas

- Timeout de triagem do baseline: causa ainda não estabelecida; worker registrar triado não comprova que a API/front cumpriu o limite.
- G10 precisa detectar arquivos, exports de valor, exports de tipo e dependências sem uso sem esconder entradas.
- G6 e G8 devem considerar imports somente de tipo; testes em services também estão dentro da regra.
- Isolamento inclui CORS, upload/download e configuração de todos os consumidores do front.
- Hook deve funcionar em clone novo e worktrees sem caminho absoluto dependente de uma cópia.
- O kit exige árvore limpa; evidências locais não versionadas podem impedir sua execução.
- Não há impedimento externo indispensável formalmente comprovado neste registro; limitações futuras devem ser documentadas com tentativas e evidências.

## Evidências e atualização

Para cada validação, registrar comando, ambiente, resultado, código de saída, commit avaliado e caminho de log/screenshot. Preservar reprovações anteriores e distinguir baseline da versão entregue. Atualizar `implementacao`, `teste`, `evidencia`, `commit` e `status` na matriz somente com dados verificáveis.

A matriz separa os escopos `ACADEMICO` e `COMPLEMENTAR`. `PENDENTE` é ausência de validação final; não converter automaticamente observação de baseline em `APROVADO`. Itens não aplicáveis exigem justificativa explícita.

## Retomada

1. Ler este estado, requisitos.json e as instruções atuais do repositório.
2. Conferir branch, HEAD e git status; preservar alterações dos outros agentes.
3. Consultar o agente principal para obter logs e decisões produzidos depois deste registro.
4. Prosseguir das pendências reais, evitando repetir testes sem necessidade.
5. Revalidar evidências afetadas por alterações posteriores e atualizar o estado após marcos.

