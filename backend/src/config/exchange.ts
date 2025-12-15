import { $Enums } from 'generated/prisma/client';
import { Address } from 'viem';

export type ExchangeConfig = {
  routerAddress: Address;
  quoterAddress: Address;
  wrappedNativeAddress: Address;
};

export const EXCHANGE_CONFIG: Record<$Enums.Exchange, ExchangeConfig> = {
  [$Enums.Exchange.PANCAKE_V3]: {
    routerAddress: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
    quoterAddress: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
    wrappedNativeAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  [$Enums.Exchange.UNISWAP_V3]: {
    routerAddress: '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2',
    quoterAddress: '0x78D78E420Da98ad378D7799bE8f4AF69033EB077',
    wrappedNativeAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
};
