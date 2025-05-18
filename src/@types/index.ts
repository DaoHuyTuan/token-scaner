export interface Account {
  id: string
  balance: string
}

export interface Transfer {
  id: string
  from: { id: string }
  to: { id: string }
  value: string
  timestamp: string
  blockNumber: string
  transaction: string
}

export interface AccountsResponse {
  data: {
    accounts: Account[]
  }
}

export interface TransfersResponse {
  data: {
    transfers: Transfer[]
  }
}
