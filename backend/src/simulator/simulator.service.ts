import { Injectable, Logger } from '@nestjs/common';
import { RepositoryService } from '../repository/repository.service';
import { UniswapV3Adapter } from '../utils/pool';
import { getAddress, Address } from 'viem';

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);
  private readonly SIMULATOR_WALLET_ADDRESS: Address;
  private readonly SWAP_INTERVAL_SECONDS = 5;
  private readonly MIN_SWAP_AMOUNT = 0.001; // Minimum swap amount in token units
  private readonly MAX_SWAP_AMOUNT = 1.0; // Maximum swap amount in token units

  constructor(private readonly repositoryService: RepositoryService) {
    const walletAddress = process.env.SIMULATOR_WALLET_ADDRESS;
    if (!walletAddress) {
      throw new Error(
        'SIMULATOR_WALLET_ADDRESS environment variable is required',
      );
    }
    this.SIMULATOR_WALLET_ADDRESS = getAddress(walletAddress);
  }

  async startSimulation() {
    this.logger.log('Starting simulation...');

    while (true) {
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

        // get a random amount to perform swap
        const randomAmount =
          Math.random() * (this.MAX_SWAP_AMOUNT - this.MIN_SWAP_AMOUNT) +
          this.MIN_SWAP_AMOUNT;
        const amountIn = BigInt(
          Math.floor(randomAmount * 10 ** tokenInDecimals),
        );

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
          `Performing swap: ${randomPair.baseToken.symbol}/${randomPair.quoteToken.symbol} ` +
            `(${randomPair.exchange}) - Direction: ${swapDirection}, Amount: ${randomAmount}`,
        );

        // perform swap
        const swapTxs = await exchangeAdapter.swap(
          this.SIMULATOR_WALLET_ADDRESS,
          {
            tokenIn,
            tokenOut,
            amountIn,
            amountOutMin,
            poolId: getAddress(randomPair.poolAddress),
          },
        );

        this.logger.log(
          `Generated ${swapTxs.length} transaction(s) for swap. ` +
            `Note: These are simulation transactions and need to be sent to the network.`,
        );

        // Show transactions
        console.log(swapTxs);

        // sleep for 5 seconds
        await this.sleep(5000);
      } catch (error) {
        this.logger.error(`Error during simulation: ${error}`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
