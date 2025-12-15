import { Address, Hex } from 'viem';

// Unified swap data type for all DEX protocols (V2, V3, V4)
export type DexSwapData =
  | {
      tokenIn: Address;
      tokenOut: Address;
      amountIn: bigint;
      amountOutMin: bigint;
      poolId: Address; // Pool address for V2/V3, or pool ID for V4
      deadline?: bigint;
      recipient?: Address;
      useWrappedNativeToken?: boolean; // If true, use WBNB/WETH instead of native token for V4 pools with native tokens
    }
  | {
      tokenIn: Address;
      tokenOut: Address;
      amountOut: bigint;
      amountInMax: bigint;
      poolId: Address; // Pool address for V2/V3, or pool ID for V4
      deadline?: bigint;
      recipient?: Address;
      useWrappedNativeToken?: boolean; // If true, use WBNB/WETH instead of native token for V4 pools with native tokens
    };

// Unified quote data type for all DEX protocols
export type DexQuoteData =
  | {
      tokenIn: Address;
      tokenOut: Address;
      amountIn: bigint;
      poolId: Address; // Pool address for V2/V3, or pool ID for V4
    }
  | {
      tokenIn: Address;
      tokenOut: Address;
      amountOut: bigint;
      poolId: Address; // Pool address for V2/V3, or pool ID for V4
    };

export type UniswapV3PoolState = {
  address: Address;
  token0: Address;
  token1: Address;

  liquidity: bigint;
  sqrtPriceX96: bigint;
  tick: number;
  feeProtocol: number;

  updatedAtBlock: bigint;
};

export type UniswapV3SwapEvent = {
  eventName: string;
  args: {
    sender: Address;
    recipient: Address;
    amount0: bigint;
    amount1: bigint;
    sqrtPriceX96: bigint;
    liquidity: bigint;
    tick: number;
  };
};

export enum ApprovalSetting {
  ONE_TIME,
  PERMANENT,
}

export type TxRequest = {
  chainId: number;
  from: Address;
  to: Address;
  data: Hex;
  value?: string; // Number string
  gas?: string; // Number string'
  maxFeePerGas?: string; // Number string
  maxPriorityFeePerGas?: string; // Number string
  nonce?: number;
};

export type ERC20Metadata = {
  name: string;
  symbol: string;
  decimals: number;
};

export type PoolState = UniswapV3PoolState;

export type UniswapV3MintPositionData = {
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline?: bigint;
  recipient?: Address;
};

export type UniswapV3IncreaseLiquidityData = {
  tokenId: bigint;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline?: bigint;
};

export type UniswapV3RemoveLiquidityData = {
  tokenId: bigint;
  liquidity: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline?: bigint;
};

export type UniswapV3PositionData = {
  nonce: bigint;
  operator: Address;
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
};

export type UniswapV3MintEventData = {
  tokenId: bigint;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
};

export interface UniswapV3StateData {
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
}

// Standardized pool state that all DEX adapters must conform to.
export interface DexPoolState {
  address: Address;
  token0: Address;
  token1: Address;
  updatedAtBlock: bigint;
  updatedAtTimestamp: bigint;
  protocolData: Record<string, any>;
}

// Standardized trade event that represents swap event from a DEX.
export interface DexTrade {
  poolAddress: Address;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOut: bigint;
}

// Standardized price update event that represents the current pool state.
export interface DexPriceUpdate {
  poolAddress: Address;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  price: string; // Decimal string representation of price (token1/token0)
  protocolData: UniswapV3StateData;
}
