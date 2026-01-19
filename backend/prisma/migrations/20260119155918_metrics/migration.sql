-- CreateTable
CREATE TABLE "TraderMetric" (
    "id" TEXT NOT NULL,
    "traderAddress" TEXT NOT NULL,
    "baseTokenAddress" TEXT NOT NULL,
    "quoteTokenAddress" TEXT NOT NULL,
    "traderType" "QueryType" NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "txCount" BIGINT NOT NULL,
    "baseBalance" BIGINT NOT NULL,
    "quoteBalance" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraderMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TraderMetric_traderAddress_blockNumber_idx" ON "TraderMetric"("traderAddress", "blockNumber");
