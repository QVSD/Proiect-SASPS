import { rpcClient } from 'src/config/clients';

import { Address, erc20Abi, encodeFunctionData, PublicClient } from 'viem';

export class ERC20Adapter {
  private readonly DEFAULT_APPROVE_GAS_LIMIT = '75000';
  private readonly GET_ALLOWANCE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private readonly cache: Map<string, { value: bigint; timestamp: number }> =
    new Map();

  constructor(protected readonly tokenAddress: Address) {}

  public async getMetadata() {
    const namePromise = rpcClient.readContract({
      abi: erc20Abi,
      address: this.tokenAddress,
      functionName: 'name',
      authorizationList: [],
    });
    const symbolPromise = rpcClient.readContract({
      abi: erc20Abi,
      address: this.tokenAddress,
      functionName: 'symbol',
      authorizationList: [],
    });
    const decimalsPromise = rpcClient.readContract({
      abi: erc20Abi,
      address: this.tokenAddress,
      functionName: 'decimals',
      authorizationList: [],
    });

    const [name, symbol, decimals] = await Promise.all([
      namePromise,
      symbolPromise,
      decimalsPromise,
    ]);

    return {
      name,
      symbol,
      decimals,
    };
  }

  public approve(owner: Address, spender: Address, amount: bigint) {
    return {
      chainId: rpcClient.chain.id,
      from: owner,
      to: this.tokenAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amount],
      }),
      gas: this.DEFAULT_APPROVE_GAS_LIMIT,
    };
  }

  public async getBalance(address: Address): Promise<bigint> {
    return rpcClient.readContract({
      abi: erc20Abi,
      address: this.tokenAddress,
      functionName: 'balanceOf',
      args: [address],
      authorizationList: [],
    });
  }

  public async getAllowance(
    owner: Address,
    spender: Address,
    useCache = false,
  ): Promise<bigint> {
    const allowance = await rpcClient.readContract({
      abi: erc20Abi,
      address: this.tokenAddress,
      functionName: 'allowance',
      args: [owner, spender],
      authorizationList: [],
    });

    return allowance;
  }
}
