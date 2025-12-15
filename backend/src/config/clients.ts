import { Chain, createPublicClient, http, webSocket } from 'viem';
import { bsc } from 'viem/chains';

const bscRpcUrl =
  process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const bscWsUrl = process.env.BSC_WS_URL || 'wss://bsc-ws-node.nariox.org:443';

const chain = {
  ...bsc,
  rpcUrls: { default: { http: [bscRpcUrl], websocket: [bscWsUrl] } },
} as Chain;

export const rpcClient = createPublicClient({
  chain,
  transport: http(bscRpcUrl),
});

export const wsClient = createPublicClient({
  chain,
  transport: webSocket(bscWsUrl),
});
