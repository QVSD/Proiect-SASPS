import { Logger } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { prisma } from 'src/config/db';
import { TraderPolling } from './trader-polling';
import { Address, getAddress } from 'viem';

type PairKey = string;

export class TraderPollingService {
  private readonly logger = new Logger(TraderPollingService.name);
  private readonly pollingServices = new Map<PairKey, TraderPolling>();

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
        if (!this.pollingServices.has(key)) {
          const [baseToken, quoteToken] = key.split(':') as [Address, Address];
          const service = new TraderPolling(baseToken, quoteToken);
          service.start();
          this.pollingServices.set(key, service);
          started += 1;
        }
      }
    }

    this.logger.log(`Started polling for ${started} trading pairs`);
    return { started };
  }
}
