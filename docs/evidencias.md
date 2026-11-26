# Evidências de avaliação

Projeto: Balcão. Data: 26/11/2026 (America/Sao_Paulo). Código de runtime/gates avaliado: `e1d5c9f`. Os commits posteriores de documentação não alteram API, front ou gates; o gate final é repetido após a documentação.

## Baseline antes de alterar

O clone original estava na main, limpo, em `e515681`. O README foi executado via Ubuntu 24.04/WSL, Node 24.22.3 e DockerDesktop. As quatro migrations passaram. npm ci não deixou Prisma Client gerado; prisma generate permitiu seed, API e worker iniciarem. Front retornou 200 e health respondeu status/db ok. Os 33 unitários passaram. Repetir a seed produziu P2002/email, como previsto no desafio.

A primeira caixa-preta no legado passou 50/51; outras rodadas iniciais tiveram timeout e ordenação inconsistentes. Essas falhas não foram ocultadas nem corrigidas mudando a aplicação.

## Diagnóstico do relógio

Medição observada: após 200 ms monotônicos, Date.now avançou 96765 ms; na amostra seguinte, voltou para 442 ms enquanto performance.now marcava 401 ms. Dentro do Docker também ocorreu salto de 98369 ms quando o relógio monotônico marcava 1804 ms. `timedatectl timesync-status` mostrou servidor ntp.ubuntu.com com offset **-1 min 36.527054 s**, enquanto Hyper-V sincronizava com o Windows.

A [documentação oficial do Ubuntu](https://ubuntu.com/wsl/docs/stable/explanation/time-sync/) explica o conflito entre sincronização implícita do Hyper-V e NTP do Ubuntu 24.04. Durante a validação, `systemctl stop systemd-timesyncd` suspendeu o sincronizador da distro; sua configuração de inicialização não foi alterada. Após a única correção inicial do Hyper-V, o relógio ficou estável e a suíte oficial passou integralmente nas duas cópias, sem mudança em código ou testes. O serviço voltou ao estado ativo ao encerrar a distro, com registro no estado final.

Logs de falhas anteriores preservados: [A](evidence/blackbox-clock-failure-a.log), [B](evidence/blackbox-clock-failure-b.log). Os logs têm duração monotônica de teste inferior ao timeout relatado, coerente com o diagnóstico externo.

## Fluxo do avaliador

| Passo | Prova e resultado |
|---|---|
|1. Clone limpo e duas subidas|Clone `validacao-limpa-final` de e1d5c9f, sem .env/node_modules; [subida](evidence/clean-up.log) e [repetição](evidence/clean-repeat.log). Mesmos recursos, exit 0. Em A, depois de repetir, banco tinha 3 usuários,3 chamados e 3 respostas; login cliente no front passou.|
|2. Duas worktrees|A e B são worktrees do clone de validação. Portas API 37557/38771, front 40537/33987, Postgres 36505/39921; projetos Compose e uploads distintos. [Isolamento](evidence/isolation.json).|
|3. Jornada visual|[Playwright](../scripts/validate-ui.mjs) fez login, abriu o chamado literal solicitado e observou Financeiro/Urgente em 3373 ms(A) e 3376 ms(B). Arquivo.txt só no host de A, download com conteúdo idêntico; B não lista o chamado e responde 404 ao ID. [JSON](evidence/browser.json) e cinco screenshots reais.|
|4. Blackbox oficial|Clone independente do upstream, commit `e515681c6173ac8e22b46f5ca3cadf052adc2c71`, sem diff. `API_URL=http://localhost:37557 npm test` e porta 38771: **51/51 em cada**, oito arquivos de teste. [A](evidence/blackbox-a.log), [B](evidence/blackbox-b.log).|
|5. Gates e kit|Baseline G1–G12 passou, unit 33/33; kit oficial barrou 19/19. Resultados em resultados.json e evidence/kit-final.log.|
|6. Regras próprias|Exemplos versionados G11/G12; execução negativa passou 2/2;17/17 casos adversariais também barrados.|
|7. Hook|Clone B recebeu hook pela subida. Dois commits tentados, G1 e G2 bloqueados, HEAD inalterado, árvore limpa. [JSON](evidence/hook/hook.json), [G1](evidence/hook/G1.log), [G2](evidence/hook/G2.log).|
|8. Supressões/exclusões|Revisão independente: nenhum arquivo src excluído; AST inclui tipos/reexports/acessos computados, G1 cobre .d.ts próprios e configs. Knip cobre apps recursivamente. Busca final registrada na revisão documental.|
|9. Encerrar e reiniciar|B encerrou API/worker/front/banco, A permaneceu saudável; B reiniciou preservando estado. [JSON](evidence/isolation.json), [down](evidence/b-down.log), [up](evidence/b-up.log).|
|10. Documentação/incidentes|AGENTS 44 linhas, CLAUDE redireciona, README contém seções exigidas, incidentes referenciam commits reais do harness.|
|11. Entradas fixas|Entradas e stack preservadas, verificação final de caminhos na revisão documental.|

## Ferramentas e escopo

- Gate: TypeScript API, ESLint/typescript-eslint, Vitest, Knip e análise AST/grafo.
- Browser: Playwright com Chromium headless instalado separadamente em /tmp/balcao-browser; não é pré-requisito para subir ou rodar gates.
- Reprodução das jornadas: `node scripts/validate-ui.mjs <copia-a> <copia-b> <playwright/index.mjs> <saida>`; preencher caminhos reais. O script falha em discrepância de isolamento, download, triagem ou erro JavaScript.
- Hook: `node scripts/validate-hook.mjs <copia-limpa> <saida>`; usar somente clone descartável limpo.
- Encerramento isolado: `node scripts/validate-isolation.mjs <copia-a> <copia-b> <saida>`.
- Relatório: `node scripts/build-report.mjs` gera HTML offline a partir da matriz e resultados, incorporando screenshots reais.
- Desempenho do gate: o kit inicialmente rodou no volume NTFS via /mnt/f (28–50 s/caso). A execução foi transferida para clone idêntico no filesystem Linux /tmp (2–4 s/caso), mantendo versão e casos. O trap restaurou a worktree original; o log parcial é preservado.

## Segurança e limites

[npm audit API](evidence/audit-api.json):8 high,1 moderate,0 critical. [Web](evidence/audit-web.json):1 high,0 critical. São alertas existentes na árvore de dependências; não foi aplicado upgrade forçado que alterasse o contrato do legado. Não se afirma ausência de vulnerabilidades.

Testes de integração herdados estão preservados e fora dos critérios; não foram executados. Cobertura de linhas não coletada. macOS não foi executado; Linux/WSL e Docker foram exercitados. Não houve CI, deploy, IA paga ou envio ao professor.

[Auditoria independente](auditoria.md) distingue inspeção estática de provas executadas; [resultados](resultados.json) e [matriz](requisitos.json) são a fonte dos números do relatório.
