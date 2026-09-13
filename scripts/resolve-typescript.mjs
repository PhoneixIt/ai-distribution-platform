import { access } from 'node:fs/promises'

export async function resolve(specifier, context, nextResolve) {
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