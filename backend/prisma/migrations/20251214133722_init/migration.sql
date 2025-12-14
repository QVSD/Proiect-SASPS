-- CreateEnum
CREATE TYPE "Exchange" AS ENUM ('PANCAKE_V3', 'UNISWAP_V3');

-- CreateEnum
CREATE TYPE "QueryType" AS ENUM ('POLLING', 'SUBSCRIPTION');

-- CreateTable
CREATE TABLE "Token" (
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "TradingPair" (
    "id" TEXT NOT NULL,
    "baseTokenAddress" TEXT NOT NULL,
    "quoteTokenAddress" TEXT NOT NULL,
    "poolAddress" TEXT NOT NULL,
    "poolFee" INTEGER NOT NULL,
    "exchange" "Exchange" NOT NULL,
    "queryType" "QueryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradingPair_poolAddress_key" ON "TradingPair"("poolAddress");

-- AddForeignKey
ALTER TABLE "TradingPair" ADD CONSTRAINT "TradingPair_baseTokenAddress_fkey" FOREIGN KEY ("baseTokenAddress") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingPair" ADD CONSTRAINT "TradingPair_quoteTokenAddress_fkey" FOREIGN KEY ("quoteTokenAddress") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
