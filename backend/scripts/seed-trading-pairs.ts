import 'dotenv/config';
import { $Enums } from '@prisma/client';
import { RepositoryService } from 'src/repository/repository.service';
import { prisma } from 'src/config/db';
import { Address, getAddress } from 'viem';

type PairSeed = {
  name: string;
  quoteToken: Address;
  pancakePool: Address;
  uniswapPool: Address;
};

const TOKENS = {
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address,
  USDT: '0x55d398326f99059fF775485246999027B3197955' as Address,
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as Address,
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
      (process.env.UNISWAP_WBNB_USDT_POOL ?? '0x0000000000000000000000000000000000000000') as Address,
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
      (process.env.UNISWAP_WBNB_USDC_POOL ?? '0x0000000000000000000000000000000000000000') as Address,
    ),
  },
  {
    name: 'USDT/USDC',
    quoteToken: TOKENS.USDC,
    pancakePool: getAddress(
      (process.env.PANCAKE_USDT_USDC_POOL ?? '0x0000000000000000000000000000000000000000') as Address,
    ),
    uniswapPool: getAddress(
      (process.env.UNISWAP_USDT_USDC_POOL ?? '0x0000000000000000000000000000000000000000') as Address,
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

