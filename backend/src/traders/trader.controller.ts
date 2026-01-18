import { Controller, Logger, Post } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { prisma } from 'src/config/db';
import { TraderPollingService } from './polling/trader-polling.service';
import { Address, getAddress } from 'viem';

type PairKey = string;

@Controller('traders')
export class TraderController {
  private readonly logger = new Logger(TraderController.name);
  private readonly pollingServices = new Map<PairKey, TraderPollingService>();

  @Post('polling/start')
  async startPolling() {
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
          const [baseToken, quoteToken] = key.split(':') as [
            Address,
            Address,
          ];
          const service = new TraderPollingService(baseToken, quoteToken);
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

