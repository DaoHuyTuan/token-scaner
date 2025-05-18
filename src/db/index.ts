import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { DATABASE_URL } from '../utils'
import { syncState, transfers, wallets } from './schema'

export const pool = new Pool({
  connectionString: 'postgres://root:123123@localhost:6789/node_pg_db'
})
export const db = drizzle(pool, { schema: { wallets, transfers, syncState } })

async function migrate(): Promise<void> {
  try {
    console.log('Running Drizzle migration...')
    await db.select().from(wallets).limit(1)
    console.log('Database migration verified.')
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  }
}
