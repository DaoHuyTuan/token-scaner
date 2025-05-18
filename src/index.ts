import axios from 'axios'
import { transfers, Wallet, wallets, Transfer, syncState } from './db/schema'
import { db, pool } from './db'
import { sql, eq } from 'drizzle-orm'
import { ACCOUNTS_QUERY, TRANSFERS_QUERY } from './queries'
import { AccountsResponse, TransfersResponse } from './@types'

async function syncSubgraphData(): Promise<void> {
  let lastAccountID = ''
  let lastTransferID = ''
  let lastBlockNumber = 0
  const batchSize = 1000
  let totalWalletsSynced = 0
  let totalTransfersSynced = 0
  let hasMoreAccounts = true
  let hasMoreTransfers = true

  try {
    // Load last sync state
    const lastSync = await db
      .select()
      .from(syncState)
      .where(eq(syncState.id, 'last_sync'))
      .limit(1)
    if (lastSync.length > 0) {
      lastAccountID = lastSync[0].lastAccountID
      lastTransferID = lastSync[0].lastTransferID
      lastBlockNumber = Number(lastSync[0].blockNumber)
    }
    console.log(
      `Starting sync: lastAccountID=${lastAccountID}, lastTransferID=${lastTransferID}, lastBlock=${lastBlockNumber}`
    )

    while (hasMoreAccounts || hasMoreTransfers) {
      const promises: Promise<void>[] = []
      let newWalletsFromTransfers: Wallet[] = []

      // Sync accounts
      if (hasMoreAccounts) {
        promises.push(
          (async () => {
            console.log(`Fetching accounts: id > ${lastAccountID}`)
            const headers = {
              Authorization: 'Bearer 02fead264f7af6a6d24b6ad0c1ebed6c'
            }
            const response = await axios
              .post<AccountsResponse>(
                'https://gateway-testnet-arbitrum.network.thegraph.com/api/subgraphs/id/9PnSTRnKdMsywJKriHLzAphndhj8yZqKqTN8zsscY2iV',
                {
                  query: ACCOUNTS_QUERY,
                  variables: {
                    first: batchSize,
                    lastID: lastAccountID
                  }
                },
                {
                  headers: headers
                }
              )
              .catch(error => {
                console.error(
                  `Accounts query failed at lastID=${lastAccountID}:`,
                  error.message
                )
                throw error
              })

            const { accounts } = response.data.data
            if (accounts.length === 0) {
              hasMoreAccounts = false
              return
            }

            const walletValues: Wallet[] = accounts.map(account => ({
              id: account.id,
              balance: account.balance
            }))

            await db
              .insert(wallets)
              .values(walletValues)
              .onConflictDoUpdate({
                target: wallets.id,
                set: { balance: sql`excluded.balance` }
              })
              .catch(error => {
                console.error('Accounts upsert failed:', error.message)
                throw error
              })

            totalWalletsSynced += walletValues.length
            lastAccountID = accounts[accounts.length - 1].id

            console.log(
              `Synced ${walletValues.length} accounts, lastAccountID=${lastAccountID}`
            )
          })()
        )
      }

      // Sync transfers
      if (hasMoreTransfers) {
        promises.push(
          (async () => {
            console.log(`Fetching transfers: id > ${lastTransferID}`)
            const headers = {
              Authorization: 'Bearer 02fead264f7af6a6d24b6ad0c1ebed6c'
            }
            const response = await axios
              .post<TransfersResponse>(
                'https://gateway-testnet-arbitrum.network.thegraph.com/api/subgraphs/id/9PnSTRnKdMsywJKriHLzAphndhj8yZqKqTN8zsscY2iV',
                {
                  query: TRANSFERS_QUERY,
                  variables: {
                    first: batchSize,
                    lastID: lastTransferID
                  }
                },
                {
                  headers
                }
              )
              .catch(error => {
                console.error(
                  `Transfers query failed at lastID=${lastTransferID}:`,
                  error.message
                )
                throw error
              })

            const { transfers: transferData } = response.data.data
            if (transferData.length === 0) {
              hasMoreTransfers = false
              return
            }

            // Extract unique addresses from transfers
            const transferAddresses = new Set<string>()
            transferData.forEach(transfer => {
              transferAddresses.add(transfer.from.id)
              transferAddresses.add(transfer.to.id)
            })

            // Check which addresses don't exist in wallets
            const existingWallets = await db
              .select({ id: wallets.id })
              .from(wallets)
              .where(
                sql`${wallets.id} IN (${Array.from(transferAddresses)
                  .map(a => `'${a}'`)
                  .join(',')})`
              )
            const existingWalletIDs = new Set(existingWallets.map(w => w.id))

            // Add new addresses with balance: '0'
            newWalletsFromTransfers = Array.from(transferAddresses)
              .filter(address => !existingWalletIDs.has(address))
              .map(address => ({
                id: address,
                balance: '0' // Default balance for new addresses
              }))

            if (newWalletsFromTransfers.length > 0) {
              await db
                .insert(wallets)
                .values(newWalletsFromTransfers)
                .onConflictDoNothing() // Don't update existing balances
                .catch(error => {
                  console.error(
                    'Transfer addresses insert failed:',
                    error.message
                  )
                  throw error
                })
              totalWalletsSynced += newWalletsFromTransfers.length
            }

            // Process transfers
            let maxBlockNumber = lastBlockNumber
            const transferValues: Transfer[] = transferData.map(transfer => {
              const blockNumber = Number(transfer.blockNumber)
              if (blockNumber > maxBlockNumber) {
                maxBlockNumber = blockNumber
              }
              return {
                id: transfer.id,
                fromId: transfer.from.id,
                toId: transfer.to.id,
                value: transfer.value,
                timestamp: new Date(Number(transfer.timestamp) * 1000),
                blockNumber,
                transaction: transfer.transaction,
                createdAt: new Date()
              }
            })

            await db
              .insert(transfers)
              .values(transferValues)
              .onConflictDoNothing()
              .catch(error => {
                console.error('Transfer insert failed:', error.message)
                throw error
              })

            totalTransfersSynced += transferValues.length
            lastTransferID = transferData[transferData.length - 1].id
            lastBlockNumber = maxBlockNumber

            console.log(
              `Synced ${transferValues.length} transfers, ${newWalletsFromTransfers.length} new wallets, ` +
                `lastTransferID=${lastTransferID}, block=${maxBlockNumber}`
            )
          })()
        )
      }

      // Run accounts and transfers concurrently
      await Promise.all(promises)

      // Update sync state
      await db
        .insert(syncState)
        .values({
          id: 'last_sync',
          blockNumber: lastBlockNumber,
          lastTransferID,
          lastAccountID
        })
        .onConflictDoUpdate({
          target: syncState.id,
          set: { blockNumber: lastBlockNumber, lastTransferID, lastAccountID }
        })
        .catch(error => {
          console.error('Sync state update failed:', error.message)
          throw error
        })

      console.log(
        `Batch completed: total ${totalWalletsSynced} wallets, ${totalTransfersSynced} transfers, ` +
          `lastAccountID=${lastAccountID}, lastTransferID=${lastTransferID}, block=${lastBlockNumber}`
      )

      // Delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(
      `Sync completed: ${totalWalletsSynced} wallets, ${totalTransfersSynced} transfers, ` +
        `final block: ${lastBlockNumber}, final transferID=${lastTransferID}, final accountID=${lastAccountID}`
    )
  } catch (error) {
    console.error('Error syncing subgraph data:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the sync
syncSubgraphData().catch(error => {
  console.error('Sync failed:', error)
  process.exit(1)
})
