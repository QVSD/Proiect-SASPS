import {
  Chain,
  createPublicClient,
  createTestClient,
  http,
  webSocket,
} from 'viem';
import { bsc } from 'viem/chains';

const bscRpcUrl = process.env.BSC_RPC_URL || 'http://localhost:8545';
const bscWsUrl = process.env.BSC_WS_URL || 'ws://localhost:8545';

export const chain = {
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

export const testClient = createTestClient({
  mode: 'anvil',
  transport: http(bscRpcUrl),
});
