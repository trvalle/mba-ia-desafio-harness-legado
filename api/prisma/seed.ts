import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@balcao.dev' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@balcao.dev',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      role: 'admin',
    },
  })

  const agent = await prisma.user.upsert({
    where: { email: 'agente@balcao.dev' },
    update: {},
    create: {
      name: 'Ana Atendente',
      email: 'agente@balcao.dev',
      passwordHash: await bcrypt.hash('Agente@123', 10),
      role: 'agent',
    },
  })

  const customer = await prisma.user.upsert({
    where: { email: 'cliente@balcao.dev' },
    update: {},
    create: {
      name: 'Carlos Cliente',
      email: 'cliente@balcao.dev',
      passwordHash: await bcrypt.hash('Cliente@123', 10),
      role: 'customer',
    },
  })

  await prisma.ticket.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Não consigo emitir a segunda via do boleto',
      description: 'Quando clico em segunda via aparece uma tela em branco. Preciso pagar até sexta.',
      customerId: customer.id,
    },
  })

  await prisma.ticket.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      title: 'Erro ao salvar o perfil',
      description: 'Ao alterar o telefone no perfil aparece a mensagem "erro inesperado".',
      status: 'in_progress',
      category: 'technical',
      priority: 'medium',
      triageStatus: 'done',
      customerId: customer.id,
      assigneeId: agent.id,
      replies: {
        create: [{ authorId: agent.id, body: 'Oi, Carlos! Já estamos olhando o problema.' }],
      },
    },
  })

  await prisma.ticket.upsert({
    where: { id: '00000000-0000-4000-8000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000003',
      title: 'Dúvida sobre troca de senha',
      description: 'Qual o tamanho mínimo de senha que o sistema aceita?',
      status: 'resolved',
      category: 'account',
      priority: 'low',
      triageStatus: 'done',
      customerId: customer.id,
      assigneeId: agent.id,
      replies: {
        create: [
          { authorId: agent.id, body: 'A senha precisa ter pelo menos 8 caracteres.' },
          { authorId: customer.id, body: 'Obrigado!' },
        ],
      },
    },
  })

  console.log(`seed ok: ${admin.email}, ${agent.email}, ${customer.email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
