import { prisma } from '../repositories/prisma'
import { env } from '../config/env'
import { classifyTicket } from '../integrations/ai-client'

const interval = env.TRIAGE_INTERVAL_MS

async function runOnce() {
  const tickets = await prisma.ticket.findMany({
    where: { triageStatus: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: 10,
  })

  for (const ticket of tickets) {
    try {
      const result = await classifyTicket(ticket)
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { category: result.category, priority: result.priority, triageStatus: 'done' },
      })
      console.log(`chamado ${ticket.id} triado: ${result.category}/${result.priority}`)
    } catch (err) {
      console.log(`falha na triagem do chamado ${ticket.id}: ${err instanceof Error ? err.message : String(err)}`)
      await prisma.ticket.update({ where: { id: ticket.id }, data: { triageStatus: 'failed' } })
    }
  }
}

async function loop() {
  try {
    await runOnce()
  } catch (err) {
    console.log('erro no worker', err)
  }
  setTimeout(loop, interval)
}

console.log(`worker de triagem rodando a cada ${interval}ms`)
loop()
