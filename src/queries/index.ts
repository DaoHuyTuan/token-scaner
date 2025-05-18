export const ACCOUNTS_QUERY = `
  query GetAccounts($first: Int!, $lastID: String!) {
    accounts(first: $first, where: { id_gt: $lastID }, orderBy: id, orderDirection: asc) {
      id
      balance
    }
  }
`

export const TRANSFERS_QUERY = `
  query GetTransfers($first: Int!, $lastID: String!) {
    transfers(first: $first, where: { id_gt: $lastID }, orderBy: id, orderDirection: asc) {
      id
      from {
        id
      }
      to {
        id
      }
      value
      timestamp
      blockNumber
      transaction
    }
  }
`
