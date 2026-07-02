import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
import { renderDefinition } from './definition'

export { renderDefinition } from './definition'

export async function render(input: z.infer<typeof renderDefinition.inputSchema>) {
  try {
    const { render } = await import('./html')
    return render(input)
  }
  catch (error) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', error)
  }
}

async function renderPreview(input: z.infer<typeof renderDefinition.inputSchema>) {
  try {
    const { renderPreview } = await import('./html')
    return renderPreview(input)
  }
  catch (error) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', error)
  }
}

export const handler = os
  .route({
    method: 'POST',
    path: '/markdown/render',
  })
  .input(renderDefinition.inputSchema)
  .output(renderDefinition.outputSchema)
  .handler(async ({ input }) => ({
    result: await render(input),
  }))

export const previewHandler = os
  .input(renderDefinition.inputSchema)
  .output(z.object({
    html: z.string(),
    css: z.string(),
  }))
  .handler(async ({ input }) => renderPreview(input))
