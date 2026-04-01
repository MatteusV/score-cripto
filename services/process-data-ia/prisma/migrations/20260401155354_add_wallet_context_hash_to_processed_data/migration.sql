/*
  Warnings:

  - Added the required column `wallet_context_hash` to the `processed_data` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "processed_data_chain_address_idx";

-- DropIndex
DROP INDEX "processed_data_valid_until_idx";

-- AlterTable
ALTER TABLE "processed_data" ADD COLUMN     "wallet_context_hash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "processed_data_chain_address_wallet_context_hash_valid_unti_idx" ON "processed_data"("chain", "address", "wallet_context_hash", "valid_until");
