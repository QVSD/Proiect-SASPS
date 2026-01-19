import { rpcClient } from '../config/clients';
import { Address, erc20Abi, encodeFunctionData } from 'viem';

export class ERC20Adapter {
  constructor(protected readonly tokenAddress: Address) {}

  public async getMetadata() {
    const namePromise = rpcClient.readContract({
      abi: erc20Abi,
      address: this.tokenAddress,
      functionName: 'name',
    });
    const symbolPromise = rpcClient.readContract({
      abi: erc20Abi,
      address: this.tokenAddress,
      functionName: 'symbol',
    });
    const decimalsPromise = rpcClient.readContract({
      abi: erc20Abi,
      address: this.tokenAddress,
      functionName: 'decimals',
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

  public transferFrom(from: Address, to: Address, amount: bigint) {
    return {
      chainId: rpcClient.chain.id,
      from: from,
      to: this.tokenAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to, amount],
      }),
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
    };
  }

  public async getBalance(address: Address): Promise<bigint> {
    return rpcClient.readContract({
      abi: erc20Abi,
      address: this.tokenAddress,
      functionName: 'balanceOf',
      args: [address],
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
    });

    return allowance;
  }
}
