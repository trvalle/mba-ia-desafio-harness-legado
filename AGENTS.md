# Balcão — entrada para agentes

Preserve o contrato HTTP, a stack e as entradas fixas do [enunciado](ENUNCIADO.md).
Sem features novas, CI ou deploy. IA fake é o padrão e não precisa de chave.

## Comandos
- Pré-requisitos: Git, Docker com Compose e Node.js LTS >=22.13; Windows via WSL.
- Subir tudo, instalar dependências e hook: `npm run up`.
- Repetir `npm run up` é seguro: mantém dados e não duplica a seed.
- Endereços, banco e anexos aparecem na saída; consultar: `npm run status`.
- Encerrar só esta cópia, preservando dados: `npm run down`.
- Rodar G1–G12, agregando todas as violações: `npm run gates`.
- Testar exemplos próprios: `npm run gates:own`.
- Kit oficial, com Git limpo: `bash kit-gates/verificar.sh . "npm run gates"`.
- Detalhes, isolamento, exemplos e avaliação: [README](README.md).

## Seed (credenciais exclusivamente locais de demonstração)
- Admin: `admin@balcao.dev` / `Admin@123`.
- Atendente: `agente@balcao.dev` / `Agente@123`.
- Cliente: `cliente@balcao.dev` / `Cliente@123`.

## Camadas
- HTTP chama serviços; nunca importa Prisma ou repositories.
- Services não importam Express, Multer ou HTTP, nem somente tipos.
- Domain contém contratos e erros independentes de infraestrutura.
- Repositories acessam o banco; composition conecta as dependências.
- OpenAI só em integrations; worker é um processo separado.
- Variáveis de ambiente só em api/src/config e web/src/config.
- Front não importa API, nem tipos; URLs passam pela configuração do front.
- Sem ciclos, any explícito, supressões, arquivos/exports/dependências mortos.
- Testes também devem respeitar as camadas; nunca exclua src dos gates.

## Trabalho e evidências
- Use uma worktree por agente que instala dependências ou executa mutações.
- Numa mesma cópia, somente um responsável por npm/lockfiles de cada pacote.
- Não execute gates enquanto a subida instala dependências; aguarde terminar.
- Não mate processos por porta nem remova volumes para corrigir a seed.
- Não presuma que npm gerou Prisma: a subida executa generate explicitamente.
- Não lance API/worker em sessões descartáveis; use o ambiente supervisionado.
- Depois de mudar gates, repita o kit; comprove regra com violação real.
- Registre erros reais e prevenção em [incidentes](docs/incidentes.md).
- Estado e pendências: [estado](docs/estado.md); [matriz](docs/requisitos.json).
- Ao trocar estas instruções, inicie uma sessão nova antes de confiar nelas.
