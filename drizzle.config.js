require('dotenv').config()
import { DATABASE_URL } from './src/utils'

module.exports = {
  schema: './src/db/schema.ts',
  out: './database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    port: 6789,
    user: 'root',
    password: '123123',
    database: 'node_pg_db',
    ssl: false
  },
  verbose: true
}
