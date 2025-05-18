CREATE TABLE wallets (
    id VARCHAR(66) PRIMARY KEY, -- Địa chỉ Ethereum (0x...)
    balance BIGINT NOT NULL
);

-- Tạo bảng transfers
CREATE TABLE transfers (
    id VARCHAR(100) PRIMARY KEY, -- ID giao dịch
    from_id VARCHAR(66) NOT NULL,
    to_id VARCHAR(66) NOT NULL,
    value BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_id) REFERENCES wallets(id),
    FOREIGN KEY (to_id) REFERENCES wallets(id)
);

-- Tạo index để tối ưu truy vấn
CREATE INDEX idx_transfers_from_id ON transfers(from_id);
CREATE INDEX idx_transfers_to_id ON transfers(to_id);