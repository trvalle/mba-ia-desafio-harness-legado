import { Router } from 'express'
import multer from 'multer'
import { asyncHandler } from '../errors'
import { HttpError } from '../../domain/errors'
import { requireAuth } from '../middlewares/auth'
import { ticketService, attachmentService, authService } from '../../composition'
import { Ticket, Reply } from '../../domain/ticket'
import { suggestReply } from '../../integrations/ai-client'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

function toTicketJson(t: Ticket) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    category: t.category,
    priority: t.priority,
    triageStatus: t.triageStatus,
    customerId: t.customerId,
    assigneeId: t.assigneeId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

function toReplyJson(r: Reply) {
  return {
    id: r.id,
    ticketId: r.ticketId,
    authorId: r.authorId,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    author: r.author,
  }
}

router.use(requireAuth)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await ticketService.list(req.user, req.query as { status?: string; page?: string })
    res.json({ ...result, items: result.items.map(toTicketJson) })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const ticket = await ticketService.create(req.user, req.body)
    res.status(201).json(toTicketJson(ticket))
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticket = await ticketService.getDetails(req.user, req.params.id)
    res.json({
      ...toTicketJson(ticket),
      replies: ticket.replies.map(toReplyJson),
      attachments: ticket.attachments,
    })
  }),
)

router.post(
  '/:id/assign',
  asyncHandler(async (req, res) => {
    const ticket = await ticketService.assign(req.user, req.params.id)
    res.json(toTicketJson(ticket))
  }),
)

router.post(
  '/:id/resolve',
  asyncHandler(async (req, res) => {
    const ticket = await ticketService.resolve(req.user, req.params.id)
    res.json(toTicketJson(ticket))
  }),
)

router.post(
  '/:id/replies',
  asyncHandler(async (req, res) => {
    const reply = await ticketService.addReply(req.user, req.params.id, req.body)
    res.status(201).json(toReplyJson(reply))
  }),
)

router.post(
  '/:id/attachments',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const attachment = await attachmentService.upload(req, req.params.id)
    res.status(201).json(attachment)
  }),
)

router.post(
  '/:id/suggest-reply',
  asyncHandler(async (req, res) => {
    if (req.user.role === 'customer') {
      throw new HttpError(403, 'forbidden', 'Só atendentes e admins podem pedir sugestão')
    }
    const ticket = await ticketService.getById(req.user, req.params.id)
    const customer = await authService.findById(ticket.customerId)
    const customerName = customer ? customer.name : 'cliente'

    res.json({
      suggestion: await suggestReply({ customerName, title: ticket.title, description: ticket.description }),
    })
  }),
)

export default router
