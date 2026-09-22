'use client'

import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import AppShell from '@/components/app-shell'
import {
  createEcosystemConnection,
  listEcosystemConnections,
  updateEcosystemConnection,
  listEcosystemOrganizations,
  ensureEcosystemOrganization,
  normalizeDomain,
  normalizeOrganizationName,
  upsertExternalIdentity,
  type EcosystemConnection,
} from '@/lib/supabase/services'
import { ensureWorkspace } from '@/lib/supabase/workspace'

const fields = [
  ['external_id', 'External record ID'],
  ['company_name', 'Company name'],
  ['legal_name', 'Legal name'],
  ['website', 'Website / domain'],
  ['country', 'Country'],
  ['address', 'Address'],
  ['city', 'City'],
  ['state_region', 'State / region'],
  ['postal_code', 'Postal code'],
  ['phone', 'Phone'],
  ['linkedin_url', 'LinkedIn URL'],
  ['role', 'Organization role(s)'],
  ['description', 'Description'],
] as const

type Field = typeof fields[number][0]
type Row = Record<string, string>
type Mapping = Partial<Record<Field, string>>

const roleAliases: Record<string, string> = {
  vendor: 'vendor',
  distributor: 'distributor',
  reseller: 'reseller',
  var: 'var',
  'var / solution provider': 'var',
  'solution provider': 'var',
  msp: 'msp',
  'managed service provider': 'msp',
  mssp: 'mssp',
  'managed security service provider': 'mssp',
  'system integrator': 'system_integrator',
  si: 'system_integrator',
  'technology partner': 'technology_partner',
  'integration partner': 'technology_partner',
  'service provider': 'service_provider',
  customer: 'customer',
}

function value(input: unknown) {
  return String(input ?? '').trim()
}

function normalizeHeader(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_')
}

function autoMap(headers: string[]): Mapping {
  const aliases: Record<Field, string[]> = {
    external_id: ['id', 'external_id', 'external_record_id', 'record_id', 'crm_id', 'account_id'],
    company_name: ['company', 'company_name', 'name', 'account_name', 'organization', 'organization_name'],
    legal_name: ['legal_name', 'registered_name'],
    website: ['website', 'web', 'domain', 'company_website', 'url'],
    country: ['country', 'country_name'],
    address: ['address', 'street', 'street_address'],
    city: ['city', 'town'],
    state_region: ['state', 'region', 'province', 'state_region'],
    postal_code: ['postal_code', 'postcode', 'zip', 'zip_code'],
    phone: ['phone', 'phone_number', 'telephone', 'mobile'],
    linkedin_url: ['linkedin', 'linkedin_url', 'linkedin_company'],
    role: ['role', 'roles', 'organization_type', 'organization_role', 'partner_type', 'company_type'],
    description: ['description', 'notes', 'about', 'company_description'],
  }
  const normalized = new Map(headers.map(header => [header, normalizeHeader(header)]))
  return Object.fromEntries(fields.map(([key]) => {
    const found = headers.find(header => aliases[key].includes(normalized.get(header) || ''))
    return [key, found || '']
  })) as Mapping
}

function rolesFrom(input: string) {
  return Array.from(new Set(
    input.split(/[,;|]/).map(item => roleAliases[item.trim().toLowerCase()]).filter(Boolean)
  ))
}

export default function IntegrationsPage() {
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [connections, setConnections] = useState<EcosystemConnection[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<{ rows: number; created: number; matched: number; review: number; errors: string[] } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { supabase, orgId } = await ensureWorkspace()
        setConnections(await listEcosystemConnections(supabase, orgId))
      } catch {}
    })()
  }, [])

  async function readFile(file: File) {
    setError('')
    setSummary(null)
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('File is larger than the 25 MB import limit.')
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const first = workbook.SheetNames[0]
      if (!first) throw new Error('No worksheet was found.')
      const sheet = workbook.Sheets[first]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
      if (!raw.length) throw new Error('No data rows were found.')
      if (raw.length > 10000) throw new Error('The first import path supports up to 10,000 rows per file.')
      const nextHeaders = Array.from(new Set(raw.flatMap(item => Object.keys(item))))
      const nextRows = raw.map(item => Object.fromEntries(Object.entries(item).map(([k, v]) => [k, value(v)]))).filter(item => Object.values(item).some(Boolean)) as Row[]
      setFileName(file.name)
      setHeaders(nextHeaders)
      setRows(nextRows)
      setMapping(autoMap(nextHeaders))
    } catch (cause) {
      setFileName('')
      setHeaders([])
      setRows([])
      setMapping({})
      setError(cause instanceof Error ? cause.message : 'Could not read the file.')
    }
  }

  const preview = useMemo(() => rows.slice(0, 6).map(row => ({
    company: row[mapping.company_name || ''] || '',
    website: row[mapping.website || ''] || '',
    country: row[mapping.country || ''] || '',
    role: row[mapping.role || ''] || '',
  })), [rows, mapping])

  async function runImport() {
    if (!mapping.company_name) {
      setError('Map the Company name column before importing.')
      return
    }

    setBusy(true)
    setError('')
    setSummary(null)

    try {
      const { supabase, orgId, user, organization } = await ensureWorkspace()
      const { data: existingConnection, error: connectionLookupError } = await supabase
        .from('ecosystem_connections')
        .select('*')
        .eq('org_id', orgId)
        .eq('provider', 'file_import')
        .eq('display_name', fileName || 'Spreadsheet import')
        .maybeSingle()
      if (connectionLookupError) throw connectionLookupError
      const connection = existingConnection
        ? existingConnection as EcosystemConnection
        : await createEcosystemConnection(supabase, orgId, user.id, {
            provider: 'file_import',
            connection_type: fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'spreadsheet',
            display_name: fileName || 'Spreadsheet import',
            sync_direction: 'inbound',
            metadata: { source_file: fileName, rows: rows.length, mapping },
          })

      const canonical = await listEcosystemOrganizations(supabase, '', 5000)
      const byDomain = new Map<string, typeof canonical[number]>()
      const byName = new Map<string, typeof canonical[number]>()
      canonical.forEach(item => {
        byName.set(item.normalized_name, item)
        if (item.primary_domain) byDomain.set(normalizeDomain(item.primary_domain) || item.primary_domain, item)
      })

      let created = 0
      let matched = 0
      let review = 0
      const errors: string[] = []

      for (let index = 0; index < rows.length; index += 1) {
        try {
          const row = rows[index]
          const company = value(row[mapping.company_name || ''])
          if (!company) continue

          const website = value(row[mapping.website || ''])
          const domain = normalizeDomain(website)
          const country = value(row[mapping.country || ''])
          const externalId = value(row[mapping.external_id || '']) || `row-${index + 2}`
          const incomingRoles = rolesFrom(value(row[mapping.role || '']))

          let target = domain ? byDomain.get(domain) || null : null
          let matchMethod = target ? 'exact_domain' : 'candidate'
          let matchConfidence = target ? 0.98 : 1
          let status: 'candidate' | 'confirmed' = target ? 'confirmed' : 'confirmed'

          if (target) {
            matched += 1
          } else {
            target = byName.get(normalizeOrganizationName(company)) || null
            if (target) {
              matchMethod = country && target.country && country.toLowerCase() === target.country.toLowerCase()
                ? 'name_and_country'
                : 'normalized_name'
              matchConfidence = matchMethod === 'name_and_country' ? 0.85 : 0.75
              status = 'candidate'
              review += 1
            }
          }

          if (!target) {
            target = await ensureEcosystemOrganization(supabase, user.id, orgId, {
              display_name: company,
              legal_name: value(row[mapping.legal_name || '']) || null,
              website: website || null,
              primary_domain: domain,
              country: country || null,
              address: value(row[mapping.address || '']) || null,
              city: value(row[mapping.city || '']) || null,
              state_region: value(row[mapping.state_region || '']) || null,
              postal_code: value(row[mapping.postal_code || '']) || null,
              phone: value(row[mapping.phone || '']) || null,
              linkedin_url: value(row[mapping.linkedin_url || '']) || null,
              organization_roles: incomingRoles,
              description: value(row[mapping.description || '']) || null,
              source_type: 'file_import',
              source_reference: fileName,
              verified: false,
            })
            byName.set(target.normalized_name, target)
            if (target.primary_domain) byDomain.set(normalizeDomain(target.primary_domain) || target.primary_domain, target)
            created += 1
          }

          if (incomingRoles.some(role => !target!.organization_roles.includes(role))) {
            const merged = Array.from(new Set([...target.organization_roles, ...incomingRoles]))
            const { data, error: roleError } = await supabase.from('ecosystem_organizations').update({
              organization_roles: merged,
              updated_at: new Date().toISOString(),
            }).eq('id', target.id).select('*').single()
            if (roleError) throw roleError
            target = data as typeof target
          }

          await upsertExternalIdentity(supabase, {
            ecosystem_organization_id: target.id,
            connection_id: connection.id,
            provider: 'file_import',
            external_record_type: 'organization',
            external_record_id: externalId,
            external_name: company,
            external_domain: domain,
            match_method: matchMethod,
            match_confidence: matchConfidence,
            status,
            metadata: { row_number: index + 2, source_file: fileName },
          })
        } catch (cause) {
          errors.push(\`Row \${index + 2}: \${cause instanceof Error ? cause.message : 'Import failed.'}\`)
          if (errors.length >= 25) break
        }
      }

      const completedConnection = await updateEcosystemConnection(supabase, orgId, connection.id, {
        sync_status: errors.length ? 'partial' : 'completed',
        last_sync_at: new Date().toISOString(),
        last_error: errors.length ? errors.slice(0, 5).join(' | ') : null,
        metadata: { source_file: fileName, rows: rows.length, created, matched, needs_review: review, errors: errors.length, workspace_role: organization.organization_type },
      })
      setConnections(list => [completedConnection, ...list.filter(item => item.id !== completedConnection.id)])
      setSummary({ rows: rows.length, created, matched, review, errors })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title="Integrations" subtitle="Connect PortAi to CRM, PRM, ERP and spreadsheet data through the canonical ecosystem layer.">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Import organizations</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Upload Excel or CSV. The file is parsed in your browser and written to your workspace. PortAi does not write back to the original system.</p>
            </div>
            <label className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
              Choose file
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={event => {
                const file = event.target.files?.[0]
                if (file) void readFile(file)
              }} />
            </label>
          </div>

          {fileName ? <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm font-medium">{fileName}</p><p className="mt-1 text-xs text-slate-500">{rows.length.toLocaleString()} rows detected</p></div> : null}
          {error ? <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-300">{error}</div> : null}

          {rows.length ? (
            <>
              <div className="mt-6">
                <h3 className="text-sm font-semibold">Map source columns</h3>
                <p className="mt-1 text-xs text-slate-500">Common CRM/PRM/Excel headings are detected automatically. Company name is required.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {fields.map(([key, label]) => (
                    <label key={key} className="text-xs font-medium text-slate-400">
                      {label}
                      <select value={mapping[key] || ''} onChange={event => setMapping(current => ({ ...current, [key]: event.target.value || undefined }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500">
                        <option value="">Not mapped</option>
                        {headers.map(header => <option key={header} value={header}>{header}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-500"><tr><th className="px-3 py-2">Company</th><th className="px-3 py-2">Website</th><th className="px-3 py-2">Country</th><th className="px-3 py-2">Role</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">{preview.map((row, index) => <tr key={index} className="text-slate-300"><td className="px-3 py-2 font-medium">{row.company || '—'}</td><td className="px-3 py-2">{row.website || '—'}</td><td className="px-3 py-2">{row.country || '—'}</td><td className="px-3 py-2">{row.role || '—'}</td></tr>)}</tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-xs leading-5 text-slate-500">Exact domain matches are linked automatically. Name-only matches stay as candidate identities instead of being silently merged.</p>
                <button type="button" disabled={!mapping.company_name || busy} onClick={() => void runImport()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Importing…' : 'Import into PortAi'}</button>
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-slate-800 p-10 text-center">
              <p className="text-sm font-medium text-slate-300">Start with a CRM, PRM, ERP or partner spreadsheet export.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Recommended columns: company name, website/domain, external ID, country, role, phone and LinkedIn URL.</p>
            </div>
          )}

          {summary ? (
            <div className="mt-6 rounded-2xl border border-emerald-900/50 bg-emerald-950/10 p-5">
              <h3 className="font-semibold text-emerald-300">Import complete</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <div><p className="text-xs text-slate-500">Rows</p><p className="mt-1 text-lg font-semibold">{summary.rows.toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-500">New organizations</p><p className="mt-1 text-lg font-semibold">{summary.created.toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-500">Exact domain matches</p><p className="mt-1 text-lg font-semibold">{summary.matched.toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-500">Needs review</p><p className="mt-1 text-lg font-semibold">{summary.review.toLocaleString()}</p></div>
              </div>
              {summary.errors.length ? <p className="mt-4 text-xs text-amber-300">{summary.errors.slice(0, 5).join(' · ')}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Connected sources</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">Each source stays separate so PortAi can preserve provenance and synchronization history.</p>
          <div className="mt-5 space-y-3">
            {connections.map(connection => (
              <div key={connection.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{connection.display_name}</p><p className="mt-1 text-xs text-slate-500">{connection.provider} · {connection.connection_type}</p></div>
                  <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] capitalize text-slate-400">{connection.sync_status}</span>
                </div>
                {connection.last_sync_at ? <p className="mt-3 text-[11px] text-slate-600">{new Date(connection.last_sync_at).toLocaleString()}</p> : null}
              </div>
            ))}
            {!connections.length ? <div className="rounded-xl border border-dashed border-slate-800 p-6 text-xs leading-5 text-slate-500">No connected sources yet. Your first spreadsheet import will appear here.</div> : null}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
