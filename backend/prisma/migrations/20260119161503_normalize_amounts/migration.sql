/*
  Warnings:

  - You are about to alter the column `blockNumber` on the `TraderMetric` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `txCount` on the `TraderMetric` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "TraderMetric" ALTER COLUMN "blockNumber" SET DATA TYPE INTEGER,
ALTER COLUMN "txCount" SET DATA TYPE INTEGER,
ALTER COLUMN "baseBalance" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "quoteBalance" SET DATA TYPE DOUBLE PRECISION;
