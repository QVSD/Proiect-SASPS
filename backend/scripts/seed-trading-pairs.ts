import 'dotenv/config';
import { $Enums } from '@prisma/client';
import { Address, getAddress } from 'viem';

import { RepositoryService } from '../src/repository/repository.service';
import { prisma } from '../src/config/db';
import { USDC, USDT, WBNB } from '../src/config/tokens';

type PairSeed = {
  name: string;
  quoteToken: Address;
  pancakePool: Address;
  uniswapPool: Address;
};

const TOKENS = {
  WBNB,
  USDT,
  USDC,
};

// Provide pool addresses via env or edit the defaults below.
const PAIRS: PairSeed[] = [
  {
    name: 'WBNB/USDT',
    quoteToken: TOKENS.USDT,
    pancakePool: getAddress(
      (process.env.PANCAKE_WBNB_USDT_POOL ??
        '0x172fcD41E0913e95784454622d1c3724f546f849') as Address,
    ),
    uniswapPool: getAddress(
      (process.env.UNISWAP_WBNB_USDT_POOL ??
        '0x0000000000000000000000000000000000000000') as Address,
    ),
  },
  {
    name: 'WBNB/USDC',
    quoteToken: TOKENS.USDC,
    pancakePool: getAddress(
      (process.env.PANCAKE_WBNB_USDC_POOL ??
        '0xf2688Fb5B81049DFB7703aDa5e770543770612C4') as Address,
    ),
    uniswapPool: getAddress(
      (process.env.UNISWAP_WBNB_USDC_POOL ??
        '0x0000000000000000000000000000000000000000') as Address,
    ),
  },
  {
    name: 'USDT/USDC',
    quoteToken: TOKENS.USDC,
    pancakePool: getAddress(
      (process.env.PANCAKE_USDT_USDC_POOL ??
        '0x0000000000000000000000000000000000000000') as Address,
    ),
    uniswapPool: getAddress(
      (process.env.UNISWAP_USDT_USDC_POOL ??
        '0x0000000000000000000000000000000000000000') as Address,
    ),
  },
];

function ensureValidAddress(label: string, address: Address) {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`${label} is missing; set it in the environment`);
  }
}

async function seed() {
  const repo = new RepositoryService();

  for (const pair of PAIRS) {
    ensureValidAddress(`${pair.name} Pancake pool`, pair.pancakePool);
    ensureValidAddress(`${pair.name} Uniswap pool`, pair.uniswapPool);

    const entries = [
      {
        exchange: $Enums.Exchange.PANCAKE_V3,
        poolAddress: pair.pancakePool,
        quoteAddress: pair.quoteToken,
      },
      {
        exchange: $Enums.Exchange.UNISWAP_V3,
        poolAddress: pair.uniswapPool,
        quoteAddress: pair.quoteToken,
      },
    ];

    for (const entry of entries) {
      const normalizedPool = getAddress(entry.poolAddress as Address);
      const existing = await prisma.tradingPair.findUnique({
        where: { poolAddress: normalizedPool },
      });

      if (existing) {
        continue;
      }

      await repo.addTradingPair({
        exchange: entry.exchange,
        poolAddress: normalizedPool,
        quoteAddress: getAddress(entry.quoteAddress as Address),
      });
    }
  }
}

seed()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Trading pairs seeded.');
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
