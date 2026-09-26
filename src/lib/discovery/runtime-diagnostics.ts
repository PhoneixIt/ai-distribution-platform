export type DiscoverySearchDiagnostics = {
  code: 'DISCOVERY_SEARCH_FAILURE' | 'DISCOVERY_SEARCH_PARTIAL_FAILURE'
  provider: 'firecrawl'
  failedQueries: number
  totalQueries: number
  details: string[]
}

export function buildDiscoverySearchDiagnostics(
  totalQueries: number,
  failedQueries: number,
  skippedResults: string[],
): DiscoverySearchDiagnostics | null {
  if (failedQueries <= 0 || totalQueries <= 0) return null

  const details = skippedResults
    .filter((result) => result.startsWith('Query failed:'))
    .slice(0, 20)

  return {
    code: failedQueries === totalQueries
      ? 'DISCOVERY_SEARCH_FAILURE'
      : 'DISCOVERY_SEARCH_PARTIAL_FAILURE',
    provider: 'firecrawl',
    failedQueries,
    totalQueries,
    details,
  }
}
