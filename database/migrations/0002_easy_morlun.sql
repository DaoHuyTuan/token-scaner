ALTER TABLE "sync_state" ADD COLUMN "last_transfer_id" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_state" ADD COLUMN "last_account_id" varchar(66) NOT NULL;