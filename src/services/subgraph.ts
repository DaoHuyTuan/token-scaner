import axios from 'axios'
import { SubgraphResponse } from '../@types'
import { db, pool } from '../db'
import { transfers, Wallet, wallets, Transfer } from '../db/schema'
import { sql } from 'drizzle-orm/sql'

async function syncSubgraphData(): Promise<void> {
  try {
    // Query the subgraph
    const response = await axios.post<SubgraphResponse>(
      'https://api.studio.thegraph.com/query/110670/token-holder/version/latest',
      {
        query: SUBGRAPH_QUERY,
        variables: {
          firstAccounts: 1000,
          firstTransfers: 1000
        }
      }
    )

    const { accounts, transfers: transferData } = response.data.data

    // Process accounts (wallets)
    const walletValues: Wallet[] = accounts.map(account => ({
      id: account.id,
      balance: account.balance
    }))

    // Upsert wallets (insert or update if id exists)
    await db
      .insert(wallets)
      .values(walletValues)
      .onConflictDoUpdate({
        target: wallets.id,
        set: { balance: sql`excluded.balance` }
      })

    // Process transfers
    const transferValues: Transfer[] = transferData.map(transfer => ({
      id: transfer.id,
      fromId: transfer.from.id,
      toId: transfer.to.id,
      value: transfer.value,
      timestamp: new Date(Number(transfer.timestamp) * 1000), // Convert Unix seconds to Date
      blockNumber: Number(transfer.blockNumber), // Convert string to number
      transaction: transfer.transaction,
      createdAt: new Date() // Local record creation time
    }))

    // Insert transfers (skip duplicates)
    await db.insert(transfers).values(transferValues).onConflictDoNothing()

    console.log(
      `Successfully synced ${accounts.length} wallets and ${transferData.length} transfers`
    )
  } catch (error) {
    console.error('Error syncing subgraph data:', error)
    throw error
  } finally {
    await pool.end()
  }
}
