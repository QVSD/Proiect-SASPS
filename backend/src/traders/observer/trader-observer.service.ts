import { Logger } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { prisma } from 'src/config/db';
import { TraderObserver } from './trader-observer';
import { Address, getAddress } from 'viem';
import { traderWalletsPrivateKeys } from 'src/config/wallets';

type PairKey = string;

export class TraderObserverService {
  private readonly logger = new Logger(TraderObserverService.name);
  private readonly observers = new Map<PairKey, TraderObserver>();

  async onModuleInit() {
    const tradingPairs = await prisma.tradingPair.findMany({
      select: {
        baseTokenAddress: true,
        quoteTokenAddress: true,
        exchange: true,
      },
    });

    const pairExchanges = new Map<PairKey, Set<$Enums.Exchange>>();

    for (const pair of tradingPairs) {
      const base = getAddress(pair.baseTokenAddress as Address);
      const quote = getAddress(pair.quoteTokenAddress as Address);
      const key = `${base}:${quote}`;

      if (!pairExchanges.has(key)) {
        pairExchanges.set(key, new Set());
      }
      pairExchanges.get(key)?.add(pair.exchange);
    }

    let started = 0;
    for (const [key, exchanges] of pairExchanges.entries()) {
      if (
        exchanges.has($Enums.Exchange.UNISWAP_V3) &&
        exchanges.has($Enums.Exchange.PANCAKE_V3)
      ) {
        if (!this.observers.has(key)) {
          const [baseToken, quoteToken] = key.split(':') as [Address, Address];
          const observer = new TraderObserver(
            traderWalletsPrivateKeys[started],
            baseToken,
            quoteToken,
          );
          observer.start();
          this.observers.set(key, observer);
          started += 1;
        }
      }
    }

    this.logger.log(`Started observers for ${started} trading pairs`);
    return { started };
  }
}
