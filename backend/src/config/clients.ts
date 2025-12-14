import { createPublicClient, http, webSocket } from 'viem';
import { bsc } from 'viem/chains';

const bscRpcUrl =
  process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const bscWsUrl = process.env.BSC_WS_URL || 'wss://bsc-ws-node.nariox.org:443';

export const rpcClient = createPublicClient({
  chain: {
    ...bsc,
    rpcUrls: { default: { http: [bscRpcUrl], webSocket: [bscWsUrl] } },
  },
  transport: http(),
});

export const wsClient = createPublicClient({
  chain: {
    ...bsc,
    rpcUrls: { default: { http: [bscRpcUrl], webSocket: [bscWsUrl] } },
  },
  transport: webSocket(),
});
