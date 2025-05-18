export const SUBGRAPH_URL = process.env.SUBGRAPH_URL
export const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY
const PG_USER = process.env.PG_USER
const PG_PASSWORD = process.env.PG_PASSWORD
const PG_PORT = process.env.PG_PORT
const PG_DB_NAME = process.env.PG_DB_NAME
export const DATABASE_URL = `postgres://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB_NAME}`
