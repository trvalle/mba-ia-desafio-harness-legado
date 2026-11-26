# Auditoria independente — histórico e revisão final das evidências

Revisão realizada em 26/11/2026 por um agente separado da implementação. Foram
lidos o enunciado completo, AGENTS.md, fontes, diferenças entre commits e
evidências disponíveis. O auditor não corrigiu a implementação, não executou
instalações nem testes de mutação e não alterou as cópias A/B. Sua única escrita
foi este registro. Não há atribuição de nota ou aprovação acadêmica.

## Primeira revisão: 1f6c3b6

Foram enviados ao responsável três achados objetivos de análise estática:

| Prioridade | Achado | Evidência e consequência |
|---|---|---|
| P1 | G5 não resolvia chave constante de acesso computado | `member()` em `scripts/gates.mjs` não recebia o mapa de constantes. `const chave = 'env' as const; export const modo = process[chave].AI_MODE` não geraria G5; o mesmo ocorria no front com `import.meta[chave]`. |
| P1 | G1 podia omitir erro semântico em declaração própria | O programa TypeScript herdava `skipLibCheck: true`. Uma interface em `src/revisao.d.ts` estendendo um tipo inexistente podia ficar sem diagnóstico G1. |
| P2 | Cobertura incompleta fora de src | G1 não incluía configurações do front fora de src; os padrões `project` do Knip não incluíam scripts novos em subdiretórios arbitrários de api/web. |

Um diagnóstico G10 para o arquivo morto não substitui o diagnóstico da regra
plantada. Os achados foram reportados antes da correção; nesta primeira revisão
não foram executados exemplos pelo auditor.

Não foi identificado desvio objetivo do contrato HTTP na leitura do diff de
rotas, serviços, repositórios, worker e front. Isolamento e idempotência foram
considerados coerentes na fonte, sem aprovação de comportamento ainda não
exercitado. AGENTS.md tinha 43 linhas; CLAUDE.md apontava para ele; blackbox e
kit-gates não tinham mudanças contra o commit inicial.

## Segunda revisão: e1d5c9f

O diff desde 1f6c3b6 foi inspecionado novamente. Os três achados estão corrigidos
na implementação examinada:

- G5 passa o mapa de constantes ao acesso computado e também resolve chaves
  constantes em desestruturação.
- G1 desativa skipLibCheck e solicita diagnósticos sintáticos e semânticos de
  cada arquivo próprio, incluindo declarações .d.ts. Declarações de dependências
  instaladas não são confundidas com fontes próprias.
- G1 enumera os arquivos próprios dos projetos, incluindo configurações; G10
  usa padrão recursivo nos dois projetos.

O comando adversarial ganhou exemplos correspondentes. A presença desses
exemplos foi verificada na fonte; sua aprovação final não foi presumida.

## Evidências inspecionadas

- **Contrato oficial:** os logs `/tmp/balcao-official-a-stable.log` e
  `/tmp/balcao-official-b-stable.log`, na distribuição Ubuntu-24.04, mostram
  8 arquivos e 51 testes aprovados em cada execução. O cabeçalho identifica
  `base-oficial/blackbox`. A cópia base-oficial estava limpa, no commit
  `e515681c6173ac8e22b46f5ca3cadf052adc2c71`, com origin apontando para o
  repositório oficial devfullcycle. Os logs temporários devem ser preservados
  entre as evidências finais pelo responsável pela entrega.
- **Navegador:** `docs/evidence/browser.json` registra triagem em 3373 ms e
  3376 ms, upload isolado, download correspondente, chamado ausente da outra
  cópia e nenhum pageerror. A leitura de `scripts/validate-ui.mjs` confirmou
  login pela interface, criação de chamado, espera pelo texto de classificação,
  comparação das pastas de anexos, comparação do conteúdo baixado e negativa
  de acesso ao chamado da outra base. `docs/evidence/anexo-a.png` foi inspecionada
  visualmente e mostra o chamado classificado e seu anexo.
- **Hook:** `docs/evidence/hook/hook.json`, G1.log, G2.log e o script de
  validação foram lidos. Os commits foram bloqueados com saída 1 e HEAD
  preservado em e1d5c9f; cada log contém a regra e o arquivo plantado corretos,
  além de 33/33 testes unitários. O script verifica core.hooksPath e restaura
  a árvore limpa.
- **Isolamento e reinício:** estados A/B têm portas, projetos Compose e pastas
  diferentes. `docs/evidence/isolation.json`, b-down.log, b-up.log e o script
  de validação mostram encerramento dos quatro serviços B, A saudável durante
  essa parada, B sem responder após down e reinício de B saudável preservando
  seu estado.

São evidências produzidas pelas validações do responsável e inspecionadas pelo
auditor, não execuções repetidas independentemente por este agente.

## Situação ao encerrar a segunda revisão

Naquele momento, o resultado final do kit, das duas regras próprias e
da bateria adversarial após e1d5c9f ainda não havia sido apresentado ao auditor.
Esses itens não foram declarados aprovados naquele parecer parcial.

Veredito parcial: os três achados anteriores foram corrigidos por inspeção; as
evidências examinadas sustentam os resultados descritos, dentro do escopo de
cada verificação. Nenhum novo achado foi identificado nesta revisão das
correções. Isso não prova ausência de toda possível violação oculta.

## Revisão final das evidências: e1d5c9f

Ainda em 26/11/2026, o auditor leu os seguintes resultados completos na
distribuição Ubuntu-24.04, sem executar mutações adicionais:

| Verificação | Evidência lida | Resultado |
|---|---|---|
| Kit oficial | `/tmp/balcao-kit-final.log` | Linha de base aprovada; 19/19 violações barradas, cada execução retornando 1. |
| Regras próprias | `/tmp/balcao-own-final.log` | 2/2 exemplos aprovados: detecção G11 e G12. |
| Bateria adversarial | `/tmp/balcao-adversarial-final.log` | 17/17 exemplos aprovados, incluindo os casos dos três achados iniciais. |

Os três arquivos correspondentes `.exit` foram lidos e contêm `0`. O clone
usado, `/tmp/balcao-gates-eval`, estava em
`e1d5c9f03e70623805401298e1520f4a26a83a1b`; a consulta
`git status --porcelain` não produziu saída. Portanto, as mutações não deixaram
alterações nessa árvore. O script adversarial verificado exige saída não zero
da execução com violação e a combinação correta de regra e arquivo; não basta
qualquer falha genérica.

Também foram lidos `docs/evidence/report-validation.json` e
`scripts/validate-report.mjs`. A evidência registra PASS para o relatório local,
com 56 requisitos, dos quais 39 acadêmicos. O script verifica em Chromium os
filtros, tema, modos, retorno da ação de copiar, galeria, destinos locais de
links e imagens carregadas. Verifica ausência de overflow horizontal em
390x844, esconde a barra lateral no modo de impressão e exige zero pageerrors.
O relatório foi aberto por arquivo local. Essas verificações de apresentação
não substituem os testes funcionais do Balcão.

Os resultados finais encerram as pendências técnicas explicitadas no parecer
anterior. Os três achados iniciais estão corrigidos na fonte e cobertos por
exemplos que passaram na validação apresentada. Nenhum novo achado foi
identificado no escopo revisado. Não se infere disso cobertura de todas as
possíveis violações ocultas ou uma nota oficial.

**Pendência única de entrega nesta revisão:** consolidar e versionar os
documentos/evidências finais e publicar essa consolidação na main do fork
público. O auditor não confirmou atualização do remoto nem realizou o push.

## Fechamento de publicação pelo integrador

Este parágrafo é do agente integrador, separado do parecer independente acima. A entrega foi publicada na main do fork público e git ls-remote confirmou44770245796ef31ec1d1a7cb83a45c5c0b96da81. A matriz e o relatório foram então atualizados para refletir essa prova. O código runtime/gates permanece e1d5c9f, sem alterações posteriores; o hook repete G1–G12 nos commits de documentação. O hash final dos metadados é confirmado na resposta ao usuário.

Os logs foram novamente produzidos em clone Linux persistente depois que o encerramento do WSL apagou /tmp. docs/evidence contém os resultados integrais, códigos0, commit validado e estado Git limpo. Nenhum resultado foi reconstruído como se fosse log original.
