import { Router } from 'express'
import { asyncHandler } from '../errors'
import { requireAuth } from '../middlewares/auth'
import { attachmentService } from '../../composition'

const router = Router()

router.get(
  '/:id/download',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { attachment, filePath } = await attachmentService.getForDownload(req.user, req.params.id)
    const asciiName = attachment.originalName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')
    res.setHeader('Content-Type', attachment.mimeType)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
    )
    res.sendFile(filePath)
  }),
)

export default router
