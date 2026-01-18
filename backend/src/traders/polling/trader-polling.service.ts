import { Injectable, Logger } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { prisma } from 'src/config/db';
import { UniswapV3Adapter } from 'src/utils/pool';
import { Address, getAddress } from 'viem';

type TradingPairConfig = Awaited<
  ReturnType<typeof prisma.tradingPair.findFirst>
>;

@Injectable()
export class TraderPollingService {
  private tradingPairUniswap: TradingPairConfig = null;
  private tradingPairPancake: TradingPairConfig = null;
  private readonly logger = new Logger(TraderPollingService.name);

  constructor(
    private readonly baseToken: Address,
    private readonly quoteToken: Address,
  ) {}

  async onModuleInit() {
    this.tradingPairUniswap = await prisma.tradingPair.findFirst({
      where: {
        baseTokenAddress: this.baseToken,
        quoteTokenAddress: this.quoteToken,
        exchange: $Enums.Exchange.UNISWAP_V3,
      },
    });
    this.tradingPairPancake = await prisma.tradingPair.findFirst({
      where: {
        baseTokenAddress: this.baseToken,
        quoteTokenAddress: this.quoteToken,
        exchange: $Enums.Exchange.PANCAKE_V3,
      },
    });

    if (!this.tradingPairUniswap)
      throw new Error(
        `Trading pair not found for Uniswap V3: ${this.baseToken} / ${this.quoteToken}`,
      );
    if (!this.tradingPairPancake)
      throw new Error(
        `Trading pair not found for Pancake V3: ${this.baseToken} / ${this.quoteToken}`,
      );
  }

  async poll() {
    if (!this.tradingPairUniswap || !this.tradingPairPancake) {
      await this.onModuleInit();
    }

    const [uniswap, pancake] = await Promise.all([
      this.fetchPrice(this.tradingPairUniswap),
      this.fetchPrice(this.tradingPairPancake),
    ]);

    if (!uniswap || !pancake) {
      return null;
    }

    const spread = (uniswap.price - pancake.price) / pancake.price;
    const opportunity =
      spread > 0
        ? 'BUY_PANCAKE_SELL_UNISWAP'
        : spread < 0
          ? 'BUY_UNISWAP_SELL_PANCAKE'
          : null;

    if (opportunity) {
      this.logger.log(
        `Arbitrage detected: ${opportunity} | ` +
          `Uniswap: ${uniswap.price} | Pancake: ${pancake.price} | ` +
          `Spread: ${(Math.abs(spread) * 100).toFixed(4)}%`,
      );
    }

    return {
      uniswap,
      pancake,
      spread,
      opportunity,
    };
  }

  async fetchPrice(tradingPair: TradingPairConfig) {
    if (!tradingPair) {
      return null;
    }

    const exchangeAdapter = new UniswapV3Adapter(tradingPair.exchange);
    const poolAddress = getAddress(tradingPair.poolAddress as Address);
    const poolState = await exchangeAdapter.getPoolState(poolAddress);
    const protocolData = poolState.protocolData as {
      sqrtPriceX96: bigint;
      tick: number;
      liquidity: bigint;
    };

    const [baseToken, quoteToken] = await Promise.all([
      prisma.token.findUnique({
        where: { address: getAddress(tradingPair.baseTokenAddress as Address) },
      }),
      prisma.token.findUnique({
        where: {
          address: getAddress(tradingPair.quoteTokenAddress as Address),
        },
      }),
    ]);

    if (!baseToken || !quoteToken) {
      throw new Error(
        `Token metadata not found for ${tradingPair.baseTokenAddress} / ${tradingPair.quoteTokenAddress}`,
      );
    }

    const token0 = getAddress(poolState.token0 as Address);
    const token1 = getAddress(poolState.token1 as Address);
    const baseAddress = getAddress(baseToken.address as Address);
    const quoteAddress = getAddress(quoteToken.address as Address);

    const token0Decimals =
      token0 === baseAddress ? baseToken.decimals : quoteToken.decimals;
    const token1Decimals =
      token1 === baseAddress ? baseToken.decimals : quoteToken.decimals;

    const priceRaw = exchangeAdapter.calculatePrice(
      {
        sqrtPriceX96: protocolData.sqrtPriceX96,
        tick: protocolData.tick,
        liquidity: protocolData.liquidity,
      },
      token0Decimals,
      token1Decimals,
    );

    const priceValue = parseFloat(priceRaw);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      throw new Error(`Invalid price computed for pool ${poolAddress}`);
    }

    // calculatePrice returns token1/token0; normalize to quote/base
    const price =
      token0 === baseAddress && token1 === quoteAddress
        ? priceValue
        : 1 / priceValue;

    return {
      exchange: tradingPair.exchange,
      poolAddress,
      price,
      priceRaw,
      blockNumber: poolState.updatedAtBlock,
      tick: protocolData.tick,
      liquidity: protocolData.liquidity,
    };
  }
}
