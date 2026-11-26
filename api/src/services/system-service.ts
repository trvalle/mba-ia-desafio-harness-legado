import { checkDatabase, groupTickets } from '../repositories/system-repository'

export async function checkHealth() {
  await checkDatabase()
}

export async function getStats() {
  const [statusRows, categoryRows, priorityRows] = await groupTickets()
  const byStatus: Record<string, number> = { open: 0, in_progress: 0, resolved: 0 }
  statusRows.forEach((row) => { byStatus[row.status] = row._count._all })
  const byCategory: Record<string, number> = { billing: 0, technical: 0, account: 0, other: 0, untriaged: 0 }
  categoryRows.forEach((row) => { byCategory[row.category || 'untriaged'] = row._count._all })
  const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0, untriaged: 0 }
  priorityRows.forEach((row) => { byPriority[row.priority || 'untriaged'] = row._count._all })
  return { byStatus, byCategory, byPriority }
}
