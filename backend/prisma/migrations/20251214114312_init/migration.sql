-- CreateEnum
CREATE TYPE "Exchange" AS ENUM ('PANCAKE_V3', 'UNISWAP_V3');

-- CreateEnum
CREATE TYPE "QueryType" AS ENUM ('POLLING', 'SUBSCRIPTION');

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingPair" (
    "id" TEXT NOT NULL,
    "baseTokenId" TEXT NOT NULL,
    "quoteTokenId" TEXT NOT NULL,
    "poolAddress" TEXT NOT NULL,
    "exchange" "Exchange" NOT NULL,
    "queryType" "QueryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_address_key" ON "Token"("address");

-- CreateIndex
CREATE UNIQUE INDEX "TradingPair_poolAddress_key" ON "TradingPair"("poolAddress");

-- AddForeignKey
ALTER TABLE "TradingPair" ADD CONSTRAINT "TradingPair_baseTokenId_fkey" FOREIGN KEY ("baseTokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingPair" ADD CONSTRAINT "TradingPair_quoteTokenId_fkey" FOREIGN KEY ("quoteTokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
