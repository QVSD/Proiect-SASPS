import { Logger } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { prisma } from 'src/config/db';
import { wsClient, chain, rpcClient } from 'src/config/clients';
import { UniswapV3Adapter } from 'src/utils/pool';
import { UNISWAP_V3_POOL_ABI } from 'src/abi/uniswap-v3';
import { ERC20Adapter } from 'src/utils/token';
import { bigIntToDecimalString } from 'src/utils/numbers';
import { Address, createWalletClient, getAddress, Hex, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

type TradingPairConfig = Awaited<
  ReturnType<typeof prisma.tradingPair.findFirst>
>;

export class TraderObserver {
  private tradingPairUniswap: TradingPairConfig = null;
  private tradingPairPancake: TradingPairConfig = null;
  private logger: Logger | null = null;
  private unwatchers: Array<() => void> = [];
  private isHandling = false;
  private baseTokenMeta: {
    address: Address;
    decimals: number;
    symbol: string;
  } | null = null;
  private quoteTokenMeta: {
    address: Address;
    decimals: number;
    symbol: string;
  } | null = null;
  private readonly SLIPPAGE_BPS = 50; // 0.50%
  private readonly MIN_SPREAD_BPS = Number(process.env.ARB_MIN_SPREAD_BPS ?? 0);
  private readonly QUOTE_TRADE_FRACTION_BPS = Number(
    process.env.ARB_QUOTE_TRADE_FRACTION_BPS ?? 200,
  ); // 2%
  private readonly wallet;
  private txCount = 0;

  constructor(
    private readonly walletPrivateKey: Hex,
    private readonly baseToken: Address,
    private readonly quoteToken: Address,
  ) {
    this.wallet = createWalletClient({
      chain: chain,
      account: privateKeyToAccount(this.walletPrivateKey),
      transport: http(),
    });
  }

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

    const [baseToken, quoteToken] = await Promise.all([
      prisma.token.findUnique({
        where: { address: getAddress(this.baseToken as Address) },
      }),
      prisma.token.findUnique({
        where: { address: getAddress(this.quoteToken as Address) },
      }),
    ]);

    if (!baseToken || !quoteToken) {
      throw new Error(
        `Token metadata not found for ${this.baseToken} / ${this.quoteToken}`,
      );
    }

    this.baseTokenMeta = {
      address: getAddress(baseToken.address as Address),
      decimals: baseToken.decimals,
      symbol: baseToken.symbol,
    };
    this.quoteTokenMeta = {
      address: getAddress(quoteToken.address as Address),
      decimals: quoteToken.decimals,
      symbol: quoteToken.symbol,
    };

    this.logger = new Logger(
      `${TraderObserver.name} - ${this.baseTokenMeta.symbol} / ${this.quoteTokenMeta.symbol}`,
    );
  }

  start() {
    if (this.unwatchers.length > 0) {
      return;
    }

    this.handlePoolUpdate();
    this.attachWatchers();
  }

  stop() {
    for (const unwatch of this.unwatchers) {
      unwatch();
    }
    this.unwatchers = [];
  }

  private async attachWatchers() {
    if (!this.tradingPairUniswap || !this.tradingPairPancake) {
      await this.onModuleInit();
    }

    const unwatch = wsClient.watchBlockNumber({
      onBlockNumber: async (blockNumber) => {
        await this.handlePoolUpdate();
      },
    });
    this.unwatchers.push(unwatch);
  }

  private async handlePoolUpdate() {
    if (this.isHandling) {
      return;
    }
    this.isHandling = true;
    try {
      if (!this.tradingPairUniswap || !this.tradingPairPancake) {
        await this.onModuleInit();
      }

      const [uniswap, pancake] = await Promise.all([
        this.fetchPrice(this.tradingPairUniswap),
        this.fetchPrice(this.tradingPairPancake),
      ]);

      if (!uniswap || !pancake) {
        return;
      }

      const spread = (uniswap.price - pancake.price) / pancake.price;
      const opportunity =
        spread > 0
          ? 'BUY_PANCAKE_SELL_UNISWAP'
          : spread < 0
            ? 'BUY_UNISWAP_SELL_PANCAKE'
            : null;

      if (opportunity) {
        const spreadBps = Math.abs(spread) * 10000;
        this.logger!.log(
          `Arbitrage detected: ${opportunity} | ` +
            `Uniswap: ${uniswap.price} | Pancake: ${pancake.price} | ` +
            `Spread: ${spreadBps.toFixed(2)} bps`,
        );

        if (spreadBps >= this.MIN_SPREAD_BPS) {
          await this.executeArbitrage(opportunity);
        }
      }
    } finally {
      this.isHandling = false;
    }
  }

  private async executeArbitrage(
    opportunity: 'BUY_PANCAKE_SELL_UNISWAP' | 'BUY_UNISWAP_SELL_PANCAKE',
  ) {
    if (!this.tradingPairUniswap || !this.tradingPairPancake) {
      return;
    }
    if (!this.baseTokenMeta || !this.quoteTokenMeta) {
      await this.onModuleInit();
    }

    const buyPair =
      opportunity === 'BUY_PANCAKE_SELL_UNISWAP'
        ? this.tradingPairPancake
        : this.tradingPairUniswap;
    const sellPair =
      opportunity === 'BUY_PANCAKE_SELL_UNISWAP'
        ? this.tradingPairUniswap
        : this.tradingPairPancake;

    const buyAdapter = new UniswapV3Adapter(buyPair.exchange);
    const sellAdapter = new UniswapV3Adapter(sellPair.exchange);

    const quoteAdapter = new ERC20Adapter(this.quoteTokenMeta!.address);
    const baseAdapter = new ERC20Adapter(this.baseTokenMeta!.address);

    const quoteBalance = await quoteAdapter.getBalance(
      this.wallet.account.address,
    );
    const amountIn =
      (quoteBalance * BigInt(this.QUOTE_TRADE_FRACTION_BPS)) / 10000n;

    if (amountIn <= 0n) {
      this.logger!.warn('Insufficient quote balance for arbitrage swap');
      return;
    }

    const baseBalanceBefore = await baseAdapter.getBalance(
      this.wallet.account.address,
    );

    const buyPool = getAddress(buyPair.poolAddress as Address);
    const buyQuote = await buyAdapter.quote({
      tokenIn: this.quoteTokenMeta!.address,
      tokenOut: this.baseTokenMeta!.address,
      amountIn,
      poolId: buyPool,
    });

    const expectedBaseOut =
      'amountOut' in buyQuote ? (buyQuote.amountOut ?? 0n) : 0n;
    const buyMinOut =
      (expectedBaseOut * BigInt(10000 - this.SLIPPAGE_BPS)) / 10000n;

    const buyTxs = await buyAdapter.swap(this.wallet.account.address, {
      tokenIn: this.quoteTokenMeta!.address,
      tokenOut: this.baseTokenMeta!.address,
      amountIn,
      amountOutMin: buyMinOut,
      poolId: buyPool,
    });

    let currentNonce = await rpcClient.getTransactionCount({
      address: this.wallet.account.address,
    });
    for (const tx of buyTxs) {
      try {
        await this.wallet.sendTransaction(tx);
        currentNonce++;
        this.txCount += 1;
      } catch (error) {
        this.logger!.error(
          `Buy leg transaction reverted for ${this.baseTokenMeta!.symbol}/${this.quoteTokenMeta!.symbol}`,
          error,
        );
        return;
      }
    }

    const baseBalanceAfter = await baseAdapter.getBalance(
      this.wallet.account.address,
    );
    const baseToSell = baseBalanceAfter - baseBalanceBefore;

    if (baseToSell <= 0n) {
      this.logger!.warn('No base tokens received from buy leg');
      return;
    }

    const sellPool = getAddress(sellPair.poolAddress as Address);
    const sellQuote = await sellAdapter.quote({
      tokenIn: this.baseTokenMeta!.address,
      tokenOut: this.quoteTokenMeta!.address,
      amountIn: baseToSell,
      poolId: sellPool,
    });

    const expectedQuoteOut =
      'amountOut' in sellQuote ? (sellQuote.amountOut ?? 0n) : 0n;
    const sellMinOut =
      (expectedQuoteOut * BigInt(10000 - this.SLIPPAGE_BPS)) / 10000n;

    const sellTxs = await sellAdapter.swap(this.wallet.account.address, {
      tokenIn: this.baseTokenMeta!.address,
      tokenOut: this.quoteTokenMeta!.address,
      amountIn: baseToSell,
      amountOutMin: sellMinOut,
      poolId: sellPool,
    });

    for (const tx of sellTxs) {
      try {
        tx.nonce = currentNonce;
        await this.wallet.sendTransaction(tx);
        currentNonce++;
        this.txCount += 1;
      } catch (error) {
        this.logger!.error(
          `Sell leg transaction reverted for ${this.baseTokenMeta!.symbol}/${this.quoteTokenMeta!.symbol}`,
          error,
        );
        break;
      }
    }

    await this.recordMetrics();

    this.logger!.log(
      `Arbitrage swap executed: ${opportunity} | ` +
        `Quote in: ${amountIn.toString()} | Base sold: ${baseToSell.toString()}`,
    );
  }

  private async recordMetrics() {
    if (!this.baseTokenMeta || !this.quoteTokenMeta) {
      return;
    }

    const [blockNumber, baseBalance, quoteBalance] = await Promise.all([
      rpcClient.getBlockNumber(),
      new ERC20Adapter(this.baseTokenMeta.address).getBalance(
        this.wallet.account.address,
      ),
      new ERC20Adapter(this.quoteTokenMeta.address).getBalance(
        this.wallet.account.address,
      ),
    ]);

    const baseBalanceNormalized = Number(
      bigIntToDecimalString(
        baseBalance,
        BigInt(10 ** this.baseTokenMeta.decimals),
      ),
    );
    const quoteBalanceNormalized = Number(
      bigIntToDecimalString(
        quoteBalance,
        BigInt(10 ** this.quoteTokenMeta.decimals),
      ),
    );

    await prisma.traderMetric.create({
      data: {
        traderAddress: this.wallet.account.address,
        baseTokenAddress: this.baseTokenMeta.address,
        quoteTokenAddress: this.quoteTokenMeta.address,
        traderType: $Enums.QueryType.SUBSCRIPTION,
        blockNumber: Number(blockNumber),
        txCount: this.txCount,
        baseBalance: baseBalanceNormalized,
        quoteBalance: quoteBalanceNormalized,
      },
    });
  }

  private async fetchPrice(tradingPair: TradingPairConfig) {
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
