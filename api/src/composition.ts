import { AttachmentService } from './services/attachment-service'
import { AuthService } from './services/auth-service'
import { TicketService } from './services/ticket-service'
import { attachmentRepository } from './repositories/attachment-repository'
import { ticketRepository } from './repositories/ticket-repository'
import { replyRepository } from './repositories/reply-repository'
import { userRepository } from './repositories/user-repository'

export const authService = new AuthService(userRepository)
export const ticketService = new TicketService(ticketRepository, replyRepository)
export const attachmentService = new AttachmentService(attachmentRepository, ticketService)
