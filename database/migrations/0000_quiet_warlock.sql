CREATE TABLE "transfers" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"from_id" varchar(66) NOT NULL,
	"to_id" varchar(66) NOT NULL,
	"value" numeric(78, 18) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"block_number" bigint NOT NULL,
	"transaction" varchar(66) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" varchar(66) PRIMARY KEY NOT NULL,
	"balance" numeric(78, 18) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_id_wallets_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_id_wallets_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_transfers_from_id" ON "transfers" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "idx_transfers_to_id" ON "transfers" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "idx_transfers_block_number" ON "transfers" USING btree ("block_number");