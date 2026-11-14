import { SQL } from 'bun'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set. Start the Postgres container and add it to .env.')

/** Bun's built-in PostgreSQL client. Point DATABASE_URL at a Supabase connection string to switch. */
export const sql = new SQL(url)

export async function migrate(): Promise<void> {
  await sql.unsafe(readFileSync(join(import.meta.dir, 'schema.sql'), 'utf8'))
}

export interface UserRow {
  id: string
  phone_number: string
  first_name: string
  last_name: string
  bvn_hash: string
  arc_wallet_address: string
  withdrawn_usdc: string
}

export async function findUserByPhone(phone: string): Promise<UserRow | null> {
  const rows = await sql<UserRow[]>`select * from users where phone_number = ${phone} limit 1`
  return rows[0] ?? null
}
