import type { extractDefinition } from './extract/definition'
import type { lintDefinition } from './lint/definition'
import type { parseDefinition } from './parse/definition'
import type { renderDefinition } from './render/definition'

export { extractDefinition } from './extract/definition'
export { lintDefinition } from './lint/definition'
export { parseDefinition } from './parse/definition'
export { renderDefinition } from './render/definition'
export type { CliDefinition, CliOptionDefinition } from './types/definition'

type MarkdownToolDefinitions = [
  typeof renderDefinition,
  typeof parseDefinition,
  typeof extractDefinition,
  typeof lintDefinition,
]

export type MarkdownToolDefinition = MarkdownToolDefinitions[number]
