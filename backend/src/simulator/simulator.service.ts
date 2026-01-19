import { Injectable, Logger } from '@nestjs/common';
import { RepositoryService } from '../repository/repository.service';
import { UniswapV3Adapter } from '../utils/pool';
import { getAddress, Address, createWalletClient } from 'viem';
import { feedAllWallets, testWallets } from '../config/wallets';
import { USDC, USDT, WBNB } from '../config/tokens';
import { ERC20Adapter } from 'src/utils/token';
import {
  bigIntToDecimalString,
  getRandomBigIntBetween,
} from 'src/utils/numbers';
import { rpcClient } from 'src/config/clients';

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);
  private readonly SWAP_INTERVAL_SECONDS = 5;

  constructor(private readonly repositoryService: RepositoryService) {}

  async onModuleInit() {
    await feedAllWallets(USDT, BigInt(100_000 * 10 ** 18));
    await feedAllWallets(USDC, BigInt(100_000 * 10 ** 18));
    await feedAllWallets(WBNB, BigInt(120 * 10 ** 18));

    this.startSimulation();
  }

  async startSimulation() {
    this.logger.log('Starting simulation...');

    const finalEndBlock = 73700000;
    let blockNumber = await rpcClient.getBlockNumber();
    while (blockNumber < finalEndBlock) {
      try {
        // get list of pools to perform swaps
        const tradingPairs = await this.repositoryService.getAllTradingPairs();

        if (tradingPairs.length === 0) {
          this.logger.warn('No trading pairs found. Waiting before retry...');
          await this.sleep(this.SWAP_INTERVAL_SECONDS * 1000);
          continue;
        }

        // get a random trading pair
        const randomPair =
          tradingPairs[Math.floor(Math.random() * tradingPairs.length)];

        // Create adapter for the exchange
        const exchangeAdapter = new UniswapV3Adapter(randomPair.exchange);

        // Get pool state to determine token0 and token1
        const poolState = await exchangeAdapter.getPoolState(
          getAddress(randomPair.poolAddress),
        );

        // get a random direction to perform swap
        const swapDirection = Math.random() < 0.5 ? 'forward' : 'reverse';
        const tokenIn =
          swapDirection === 'forward'
            ? getAddress(poolState.token0)
            : getAddress(poolState.token1);
        const tokenOut =
          swapDirection === 'forward'
            ? getAddress(poolState.token1)
            : getAddress(poolState.token0);

        // Determine which token (base or quote) we're swapping from to get correct decimals
        const tokenInAddress = getAddress(tokenIn);
        const isBaseToken =
          tokenInAddress === getAddress(randomPair.baseTokenAddress);
        const isQuoteToken =
          tokenInAddress === getAddress(randomPair.quoteTokenAddress);

        let tokenInDecimals: number;
        if (isBaseToken) {
          tokenInDecimals = randomPair.baseToken.decimals;
        } else if (isQuoteToken) {
          tokenInDecimals = randomPair.quoteToken.decimals;
        } else {
          // Fallback: use base token decimals if token doesn't match (shouldn't happen)
          this.logger.warn(
            `Token ${tokenInAddress} doesn't match base or quote token for pair ${randomPair.id}`,
          );
          tokenInDecimals = randomPair.baseToken.decimals;
        }

        const wallet =
          testWallets[Math.floor(Math.random() * testWallets.length)];
        const tokenInAdapter = new ERC20Adapter(tokenIn);
        const tokenInBalance = await tokenInAdapter.getBalance(
          wallet.account.address,
        );
        const maxSwapAmount = tokenInBalance / 2n;
        const minSwapAmount = tokenInBalance / 1000n;

        // get a random amount to perform swap
        const amountIn = getRandomBigIntBetween(minSwapAmount, maxSwapAmount);

        // Get quote to determine minimum amount out
        const quoteResult = await exchangeAdapter.quote({
          tokenIn,
          tokenOut,
          amountIn,
          poolId: getAddress(randomPair.poolAddress),
        });

        // Calculate minimum amount out with 0.5% slippage tolerance
        const amountOutValue =
          'amountOut' in quoteResult && quoteResult.amountOut !== undefined
            ? quoteResult.amountOut
            : BigInt(0);
        const amountOutMin = (amountOutValue * BigInt(995)) / BigInt(1000);

        this.logger.log(
          `Performing swap: ${randomPair.baseToken.symbol}/${randomPair.quoteToken.symbol} with wallet ${wallet.account.address} ` +
            `(${randomPair.exchange}) - Direction: ${swapDirection}, Amount: ${bigIntToDecimalString(amountIn, BigInt(10 ** tokenInDecimals))}`,
        );

        // perform swap
        const swapTxs = await exchangeAdapter.swap(wallet.account.address, {
          tokenIn,
          tokenOut,
          amountIn,
          amountOutMin,
          poolId: getAddress(randomPair.poolAddress),
        });

        for (const tx of swapTxs) {
          await wallet.sendTransaction(tx);
        }

        await this.sleep(500);
        blockNumber = await rpcClient.getBlockNumber();
      } catch (error) {
        this.logger.error(`Error during simulation: ${error}`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
