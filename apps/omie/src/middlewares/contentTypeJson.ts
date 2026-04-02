import { type Request, type Response, type NextFunction } from 'express'

export function contentTypeJsonMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const contentType = req.headers['content-type']

  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    res.status(400).json({
      error: {
        code: 'INVALID_CONTENT_TYPE',
        message: 'Content-Type deve ser application/json',
      },
    })
    return
  }

  next()
}
