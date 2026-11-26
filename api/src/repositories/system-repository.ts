import { prisma } from './prisma'

export function checkDatabase() {
  return prisma.$queryRaw`SELECT 1`
}

export function groupTickets() {
  return Promise.all([
    prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ['priority'], _count: { _all: true } }),
  ])
}
