import type { EmailSendRequest, EmailSendResult } from './types.ts'

export interface EmailProvider {
  send(request: EmailSendRequest): Promise<EmailSendResult>
}
