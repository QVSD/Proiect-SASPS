import { Injectable } from '@nestjs/common';
import { TradingPairImportDto } from 'src/dto/index';
import { prisma } from '../config/db';
import { ERC20Adapter } from 'src/utils/token';
import { getAddress } from 'viem';
import { UniswapV3Adapter } from 'src/utils/pool';

@Injectable()
export class RepositoryService {
  async addToken(address: string) {
    const normalizedAddress = getAddress(address);
    const erc20Adapter = new ERC20Adapter(normalizedAddress);
    const { name, symbol, decimals } = await erc20Adapter.getMetadata();
    return prisma.token.create({
      data: {
        address: normalizedAddress,
        name,
        symbol,
        decimals,
      },
    });
  }

  async getToken(address: string) {
    const normalizedAddress = getAddress(address);
    const token = await prisma.token.findUnique({
      where: { address: normalizedAddress },
    });
    if (!token) {
      return this.addToken(normalizedAddress);
    }
    return token;
  }

  async addTradingPair(data: TradingPairImportDto) {
    const normalizedPoolAddress = getAddress(data.poolAddress);
    const exchangeAdapter = new UniswapV3Adapter(data.exchange);
    const poolFee = await exchangeAdapter.getPoolFee(normalizedPoolAddress);
    const poolState = await exchangeAdapter.getPoolState(normalizedPoolAddress);

    const quoteToken = await this.getToken(data.quoteAddress);
    const baseToken = await this.getToken(
      getAddress(poolState.token0) === quoteToken.address
        ? getAddress(poolState.token1)
        : getAddress(poolState.token0),
    );

    const createdAt = new Date();
    const tradingPair = await prisma.tradingPair.create({
      data: {
        exchange: data.exchange,
        poolAddress: data.poolAddress,
        poolFee: poolFee,
        createdAt,
        updatedAt: createdAt,
        quoteTokenAddress: quoteToken.address,
        baseTokenAddress: baseToken.address,
      },
    });

    return tradingPair;
  }

  async getAllTradingPairs() {
    return prisma.tradingPair.findMany({
      include: {
        baseToken: true,
        quoteToken: true,
      },
    });
  }
}
