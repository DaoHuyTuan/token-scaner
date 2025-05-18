import {
  pgTable,
  varchar,
  bigint,
  timestamp,
  index,
  foreignKey,
  decimal
} from 'drizzle-orm/pg-core'

export const wallets = pgTable('wallets', {
  id: varchar('id', { length: 66 }).primaryKey(), // Ethereum address
  balance: decimal('balance', { precision: 78, scale: 18 }).notNull() // Token balance
})

export const transfers = pgTable(
  'transfers',
  {
    id: varchar('id', { length: 100 }).primaryKey(), // Subgraph transfer ID
    fromId: varchar('from_id', { length: 66 }).notNull(), // From address
    toId: varchar('to_id', { length: 66 }).notNull(), // To address
    value: decimal('value', { precision: 78, scale: 18 }).notNull(), // Transfer amount
    timestamp: timestamp('timestamp').notNull(), // Unix timestamp
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(), // Block number
    transaction: varchar('transaction', { length: 66 }).notNull(), // Transaction hash
    createdAt: timestamp('created_at').defaultNow() // Local record creation time
  },
  table => ({
    fromIdFk: foreignKey({
      columns: [table.fromId],
      foreignColumns: [wallets.id]
    }),
    toIdFk: foreignKey({
      columns: [table.toId],
      foreignColumns: [wallets.id]
    }),
    fromIdIdx: index('idx_transfers_from_id').on(table.fromId),
    toIdIdx: index('idx_transfers_to_id').on(table.toId),
    blockNumberIdx: index('idx_transfers_block_number').on(table.blockNumber)
  })
)

export const syncState = pgTable('sync_state', {
  id: varchar('id', { length: 50 }).primaryKey(), // e.g., 'last_sync'
  blockNumber: bigint('block_number', { mode: 'number' }).notNull(), // Last synced block
  lastTransferID: varchar('last_transfer_id', { length: 100 }).notNull(), // Last synced transfer ID
  lastAccountID: varchar('last_account_id', { length: 66 }).notNull() // Last synced account ID
})

export type Wallet = typeof wallets.$inferSelect
export type Transfer = typeof transfers.$inferSelect
export type SyncState = typeof syncState.$inferSelect
