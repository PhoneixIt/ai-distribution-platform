import { access } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve as resolvePath } from 'node:path'

const SRC_ROOT = fileURLToPath(new URL('../src/', import.meta.url))

export async function resolve(specifier, context, nextResolve) {
  // Resolve the `@/` path alias onto src/ so production modules can be loaded directly.
  if (specifier.startsWith('@/')) {
    const aliased = resolvePath(SRC_ROOT, `${specifier.slice(2)}.ts`)
    try {
      await access(aliased)
      return nextResolve(pathToFileURL(aliased).href, context)
    } catch {
      // Let Node resolve the original specifier and report its normal error.
    }
  }

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    try {
      await access(new URL(`${specifier}.ts`, context.parentURL))
      return nextResolve(`${specifier}.ts`, context)
    } catch {
      // Let Node resolve the original specifier and report its normal error.
    }
  }

  return nextResolve(specifier, context)
}