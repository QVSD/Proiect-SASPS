import { Address, encodeFunctionData, maxUint256 } from 'viem';
import { $Enums } from '@prisma/client';

import {
  UNISWAP_V3_POOL_ABI,
  UNISWAP_V3_QUOTER_ABI,
  UNISWAP_V3_ROUTER_ABI,
  UNISWAP_V3_SWAP_ROUTER_ABI,
} from '../abi/uniswap-v3';
import { rpcClient } from '../config/clients';
import { ERC20Adapter } from './token';
import {
  DexSwapData,
  ApprovalSetting,
  TxRequest,
  DexQuoteData,
  DexPoolState,
  UniswapV3StateData,
} from './types';
import { EXCHANGE_CONFIG, ExchangeConfig } from '../config/exchange';
import { bigIntToDecimalString } from './numbers';

export class UniswapV3Adapter {
  private readonly isPancakeV3: boolean;
  private readonly DEFAULT_SWAP_GAS_LIMIT = '300000';
  private readonly exchangeConfig: ExchangeConfig;

  constructor(private readonly exchangeId: $Enums.Exchange) {
    this.isPancakeV3 = exchangeId === $Enums.Exchange.PANCAKE_V3;
    this.exchangeConfig = EXCHANGE_CONFIG[exchangeId];
  }

  public id(): $Enums.Exchange {
    return this.exchangeId;
  }

  public async getPoolFee(pool: Address): Promise<number> {
    // Fetch from contract and cache
    const fee = await rpcClient.readContract({
      address: pool,
      abi: UNISWAP_V3_POOL_ABI,
      functionName: 'fee',
    });

    return fee;
  }

  public async swap(
    initiator: Address,
    swapData: DexSwapData,
    approvalSetting: ApprovalSetting = ApprovalSetting.PERMANENT,
  ) {
    const txs: TxRequest[] = [];

    // Get fee from pool using poolId
    const pool = swapData.poolId;
    const fee = await this.getPoolFee(pool);

    const tokenInAdapter = new ERC20Adapter(swapData.tokenIn);
    const allowance = await tokenInAdapter.getAllowance(
      initiator,
      this.exchangeConfig.routerAddress,
    );
    const amountInRequired =
      'amountIn' in swapData ? swapData.amountIn : swapData.amountInMax;

    if (allowance < amountInRequired) {
      const approvalAmount =
        approvalSetting === ApprovalSetting.ONE_TIME
          ? amountInRequired
          : maxUint256;

      const approvalTx = tokenInAdapter.approve(
        initiator,
        this.exchangeConfig.routerAddress,
        approvalAmount,
      );
      txs.push(approvalTx);
    }

    const defaultDeadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 2); // 2 minutes from the current Unix time

    // PancakeSwap V3 uses original SwapRouter ABI with deadline parameter
    // Uniswap V3 uses SwapRouter02 ABI without deadline parameter
    let swapData_encoded: `0x${string}`;

    if (this.isPancakeV3) {
      // PancakeSwap V3 SwapRouter (has deadline parameter)
      if ('amountIn' in swapData) {
        swapData_encoded = encodeFunctionData({
          abi: UNISWAP_V3_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [
            {
              amountIn: swapData.amountIn,
              amountOutMinimum: swapData.amountOutMin,
              fee,
              recipient: swapData.recipient ?? initiator,
              deadline: swapData.deadline ?? defaultDeadline,
              sqrtPriceLimitX96: BigInt(0),
              tokenIn: swapData.tokenIn,
              tokenOut: swapData.tokenOut,
            },
          ],
        });
      } else {
        swapData_encoded = encodeFunctionData({
          abi: UNISWAP_V3_ROUTER_ABI,
          functionName: 'exactOutputSingle',
          args: [
            {
              amountOut: swapData.amountOut,
              amountInMaximum: swapData.amountInMax,
              fee,
              recipient: swapData.recipient ?? initiator,
              deadline: swapData.deadline ?? defaultDeadline,
              sqrtPriceLimitX96: BigInt(0),
              tokenIn: swapData.tokenIn,
              tokenOut: swapData.tokenOut,
            },
          ],
        });
      }
    } else {
      // Uniswap V3 SwapRouter02 (no deadline parameter)
      if ('amountIn' in swapData) {
        swapData_encoded = encodeFunctionData({
          abi: UNISWAP_V3_SWAP_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [
            {
              tokenIn: swapData.tokenIn,
              tokenOut: swapData.tokenOut,
              fee,
              recipient: swapData.recipient ?? initiator,
              amountIn: swapData.amountIn,
              amountOutMinimum: swapData.amountOutMin,
              sqrtPriceLimitX96: BigInt(0),
            },
          ],
        });
      } else {
        swapData_encoded = encodeFunctionData({
          abi: UNISWAP_V3_SWAP_ROUTER_ABI,
          functionName: 'exactOutputSingle',
          args: [
            {
              tokenIn: swapData.tokenIn,
              tokenOut: swapData.tokenOut,
              fee,
              recipient: swapData.recipient ?? initiator,
              amountOut: swapData.amountOut,
              amountInMaximum: swapData.amountInMax,
              sqrtPriceLimitX96: BigInt(0),
            },
          ],
        });
      }
    }

    const swapTx = {
      chainId: rpcClient.chain.id,
      from: initiator,
      to: this.exchangeConfig.routerAddress,
      gas: this.DEFAULT_SWAP_GAS_LIMIT,
      data: swapData_encoded,
    };
    txs.push(swapTx);
    return txs;
  }

  public async quote(quoteData: DexQuoteData) {
    const quoterAddress = this.exchangeConfig.quoterAddress;

    // Get fee from pool using poolId
    const pool = quoteData.poolId;
    const fee = await this.getPoolFee(pool);

    if ('amountIn' in quoteData) {
      const output = await rpcClient.simulateContract({
        abi: UNISWAP_V3_QUOTER_ABI,
        address: quoterAddress,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            amountIn: quoteData.amountIn,
            fee,
            sqrtPriceLimitX96: BigInt(0),
            tokenIn: quoteData.tokenIn,
            tokenOut: quoteData.tokenOut,
          },
        ],
      });

      return {
        amountOut: output.result[0],
        sqrPriceX86After: output.result[1],
        initializedTicksCrossed: output.result[2],
        gasEstimate: output.result[3],
      };
    }

    const output = await rpcClient.simulateContract({
      abi: UNISWAP_V3_QUOTER_ABI,
      address: quoterAddress,
      functionName: 'quoteExactOutputSingle',
      args: [
        {
          amount: quoteData.amountOut,
          fee,
          sqrtPriceLimitX96: BigInt(0),
          tokenIn: quoteData.tokenIn,
          tokenOut: quoteData.tokenOut,
        },
      ],
    });
    return {
      amountIn: output.result[0],
      sqrtPriceX96After: output.result[1],
      initializedTicksCrossed: output.result[2],
      gasEstimate: output.result[3],
    };
  }

  public async getPoolState(pool: Address): Promise<DexPoolState> {
    const slot0Promise = rpcClient.readContract({
      address: pool,
      abi: UNISWAP_V3_POOL_ABI,
      functionName: 'slot0',
    });
    const liquidityPromise = rpcClient.readContract({
      address: pool,
      abi: UNISWAP_V3_POOL_ABI,
      functionName: 'liquidity',
    });
    const token0Promise = rpcClient.readContract({
      address: pool,
      abi: UNISWAP_V3_POOL_ABI,
      functionName: 'token0',
    });
    const token1Promise = rpcClient.readContract({
      address: pool,
      abi: UNISWAP_V3_POOL_ABI,
      functionName: 'token1',
    });
    const blockPromise = rpcClient.getBlock({ blockTag: 'latest' });

    const [slot0, liquidity, token0, token1, block] = await Promise.all([
      slot0Promise,
      liquidityPromise,
      token0Promise,
      token1Promise,
      blockPromise,
    ]);

    return {
      address: pool,
      token0: token0 as Address,
      token1: token1 as Address,
      updatedAtBlock: block.number,
      updatedAtTimestamp: block.timestamp,
      protocolData: {
        liquidity: liquidity,
        sqrtPriceX96: slot0[0],
        tick: slot0[1],
        feeProtocol: slot0[5],
      },
    };
  }

  public calculatePrice(
    stateData: UniswapV3StateData,
    token0Decimals: number,
    token1Decimals: number,
  ): string {
    const { sqrtPriceX96 } = stateData;

    const PRECISION_SCALAR = BigInt(10 ** 18);
    const Q96 = BigInt(2 ** 96);
    const Q192 = Q96 * Q96;

    const sqrtPriceSquared = BigInt(sqrtPriceX96 * sqrtPriceX96);
    const decimalAdjustment = BigInt(
      10 ** Math.abs(token0Decimals - token1Decimals),
    );

    let adjustedPrice: bigint;
    if (token0Decimals > token1Decimals) {
      adjustedPrice =
        (sqrtPriceSquared * decimalAdjustment * PRECISION_SCALAR) / Q192;
    } else {
      adjustedPrice =
        (sqrtPriceSquared * PRECISION_SCALAR) / (Q192 * decimalAdjustment);
    }

    return bigIntToDecimalString(adjustedPrice, PRECISION_SCALAR);
  }

  public async getTickSpacing(poolId: Address): Promise<number> {
    const tickSpacing = await rpcClient.readContract({
      address: poolId,
      abi: UNISWAP_V3_POOL_ABI,
      functionName: 'tickSpacing',
    });
    return tickSpacing;
  }
}
