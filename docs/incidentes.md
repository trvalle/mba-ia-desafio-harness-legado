# Incidentes reais e aprendizado do harness

Eventos observados durante a implementação com Codex. Defeitos herdados (como seed duplicada) são diagnóstico, não erros atribuídos ao agente. Hashes pendentes serão substituídos pelos commits efetivos das prevenções.

## I1 — Presumir que a instalação geraria Prisma
- O agente iniciou seed/API/worker após npm ci sem confirmar o client gerado.
- Resultado: @prisma/client did not initialize yet; migrations haviam passado.
- Correção e prevenção: prisma generate explícito na subida e na imagem, antes de seed e serviços; ordem documentada no AGENTS.md.
- Commit da prevenção: `be517dced8d2146c7245fd1f74934af9fe319673`.

## I2 — Processos em sessão WSL descartável
- O agente lançou processos com nohup e encerrou a sessão usada pela ferramenta.
- Resultado: nova inspeção não encontrou API/worker/Vite vivos; foi preciso manter uma sessão aberta para concluir o baseline.
- Correção e prevenção: serviços Compose independentes do terminal, com init e health checks; AGENTS.md orienta usar o ambiente supervisionado.
- Commit da prevenção: `be517dced8d2146c7245fd1f74934af9fe319673`.

## I3 — Instalações concorrentes na mesma cópia
- O agente principal executou npm ci da subida enquanto o agente de refatoração iniciou npm uninstall na API, antes de receber o aviso da instalação.
- Resultado: EACCES ao renomear effect, TAR_ENTRY_ERROR e tipos temporariamente ausentes.
- Correção: instalação serializada sob um responsável; repetir a instalação e os gates.
- Prevenção: lock da subida, recusa explícita dos gates durante a instalação e regra AGENTS.md para usar worktrees e não executar instalações concorrentes na mesma cópia.
- Commit da prevenção: `be517dced8d2146c7245fd1f74934af9fe319673`.
