# Estado da entrega — Balcão

Runtime e gates validados: `e1d5c9f03e70623805401298e1520f4a26a83a1b`.
Branch de entrega: main. Repositório: https://github.com/trvalle/mba-ia-desafio-harness-legado
Commit inicial: e515681. Os commits seguintes de relatório/evidências não alteram o comportamento testado.

## Verificações concluídas

- Clone limpo final: duas subidas sem .env preexistente; API/worker/front/banco no ar.
- Worktrees A/B: recursos distintos, login e triagem visual em3373/3376ms, upload exclusivo, download íntegro e404 na cópia errada.
- Blackbox oficial upstream e515681:51/51 em A e51/51 em B.
- Unitários33/33; gates G1–G12 verdes.
- Kit oficial19/19, próprias2/2, adversariais17/17; logs consolidados em docs/evidence.
- Hook bloqueou commits G1/G2 sem alterar HEAD; cópia ficou limpa.
- B encerrada e reiniciada sem afetar A; todos os ambientes de teste encerrados no final, dados preservados.
- Auditoria independente encontrou e verificou correção de três lacunas nos gates.
- HTML offline testado em desktop/mobile: modo, tema, filtros, busca, copiar/selecionar comando, imagens, galeria, links e CSS de impressão, sem erros JavaScript.

## Ambiente e limitações

Desenvolvimento no Ubuntu24.04/WSL, Node24.22.3 e DockerDesktop. O conflito NTP/Hyper-V de96,5s foi diagnosticado e o sincronizador suspenso temporariamente para os testes de contrato. Não houve mudança da configuração de inicialização; systemd-timesyncd voltou ativo depois do encerramento da distro. A aplicação e os testes oficiais não foram alterados para contornar o relógio.

npm audit: API8 high/1 moderate e web1 high, zero critical. Esses alertas permanecem documentados, sem upgrades forçados da stack. Cobertura de linhas não coletada; integração herdada e macOS não executados.

## Estado de publicação

Consolidação/versionamento e push finais em andamento. A resposta final informará o hash remoto confirmado. A matriz distingue os itens ainda pendentes de publicação; nenhuma nota do professor foi atribuída.

## Retomada e reprodução

Leia AGENTS.md. Execute npm run up e npm run gates; para testes de mutação use cópia limpa e os comandos do README. HTML: docs/relatorio-final.html. Matriz: docs/requisitos.json. Resultados: docs/resultados.json. Evidências: docs/evidence. Auditoria: docs/auditoria.md.

Logs devem ser preservados em caminho persistente antes de encerrar WSL. /tmp foi limpo ao encerrar a sessão de teste; kit/own/adversarial foram reexecutados integralmente em clone Linux persistente, gravando diretamente no repositório.
