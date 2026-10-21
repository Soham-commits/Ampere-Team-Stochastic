import postgres from 'postgres'
import { readFileSync, readdirSync } from 'node:fs'
import { config } from '../env'

export type Sql = postgres.Sql

export function connect(url = config.databaseUrl): Sql {
  return postgres(url, {
    max: 5,
    onnotice: () => undefined,
    connection: { statement_timeout: 10_000 },
  })
}

const MIGRATIONS = new URL('../../db/migrations/', import.meta.url)

/** Applies every migration file once, in name order, each in its own transaction. */
export async function migrate(sql: Sql) {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
  const applied = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name))
  for (const name of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(name)) continue
    const text = readFileSync(new URL(name, MIGRATIONS), 'utf8')
    await sql.begin(async (tx) => {
      await tx.unsafe(text)
      await tx`INSERT INTO schema_migrations (name) VALUES (${name})`
    })
    console.log(`[ampere] migrated ${name}`)
  }
}
