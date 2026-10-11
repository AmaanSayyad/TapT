import { ethers } from 'ethers';
import { BASE_RPC, BASE_SEQUENCER_RPC, EVM_CHAINS, type EvmPlayNetwork, treasuryAddressFor } from '@/lib/chains/supported';

const TIP20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferWithMemo(address to, uint256 amount, bytes32 memo) returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

/** A fixed chain id stops ethers from polling eth_chainId and logging forever when a node is quiet. */
function rpcProvider(url: string, chainId: number) {
  return new ethers.JsonRpcProvider(url, chainId, { staticNetwork: true });
}

function requireSecret(network: EvmPlayNetwork): string {
  const raw = process.env[EVM_CHAINS[network].secretEnv];
  if (!raw?.trim()) {
    throw new Error(`${EVM_CHAINS[network].secretEnv} is not set`);
  }
  const key = raw.trim();
  return key.startsWith('0x') ? key : `0x${key}`;
}

/** Send a payout from that chain's treasury to the user. */
export async function transferFromEvmTreasury(
  network: EvmPlayNetwork,
  recipient: string,
  amount: number,
): Promise<string> {
  const spec = EVM_CHAINS[network];
  const treasury = treasuryAddressFor(network);
  if (!treasury) throw new Error(`${spec.treasuryEnv} is not set`);

  const provider = rpcProvider(spec.rpc, spec.chainId);
  const wallet = new ethers.Wallet(requireSecret(network), provider);

  try {
    if (spec.token) {
      const token = new ethers.Contract(spec.token.address, TIP20_ABI, wallet);
      const units = ethers.parseUnits(amount.toFixed(spec.token.decimals), spec.token.decimals);
      // A Tempo TIP-20 transfer pays its fee in that token, on top of the amount.
      // The memo is the recipient, so the payout can be matched later.
      if (network === 'TEMPO') {
        const memo = ethers.zeroPadValue(recipient, 32);
        const data = token.interface.encodeFunctionData('transferWithMemo', [recipient, units, memo]);
        const estimated = await provider.estimateGas({ from: wallet.address, to: spec.token.address, data });
        const tx = await token.transferWithMemo(recipient, units, memo, { gasLimit: (estimated * 12n) / 10n });
        const receipt = await tx.wait(1);
        if (!receipt) throw new Error('Tempo payout was not confirmed');
        return receipt.hash;
      }
      if (network === 'BASE') {
        // Await here. A bare return lets the finally block destroy the provider
        // before the payout has been submitted.
        return await broadcastBaseTransfer(provider, wallet, token, recipient, units);
      }
      const tx = await token.transfer(recipient, units);
      const receipt = await tx.wait();
      return receipt.hash;
    }

    const value = ethers.parseEther(amount.toFixed(18));
    const txRequest = { to: recipient, value };
    // Arbitrum folds the Ethereum data fee into one limit. Ask the node, then pad it.
    const gas = network === 'ARB'
      ? ((await provider.estimateGas({ ...txRequest, from: wallet.address })) * 12n) / 10n
      : undefined;
    const tx = await wallet.sendTransaction({ ...txRequest, gas });
    const receipt = await tx.wait();
    return receipt.hash;
  } finally {
    provider.destroy();
  }
}

/** Sign against the read RPC, then submit the raw transaction to the Base sequencer. */
async function broadcastBaseTransfer(
  provider: ethers.JsonRpcProvider,
  wallet: ethers.Wallet,
  token: ethers.Contract,
  recipient: string,
  units: bigint,
): Promise<string> {
  const populated = await token.transfer.populateTransaction(recipient, units);
  populated.from = wallet.address;
  const gasLimit = ((await provider.estimateGas(populated)) * 12n) / 10n;
  const fee = await provider.getFeeData();
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');
  const signed = await wallet.signTransaction({
    to: populated.to,
    data: populated.data,
    value: 0n,
    gasLimit,
    nonce,
    chainId: 8453,
    type: 2,
    maxFeePerGas: fee.maxFeePerGas ?? 1_000_000_000n,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? 1_000_000n,
  });
  // The sequencer rejects eth_blockNumber, which ethers calls before a normal send.
  // Submit the raw transaction directly, then wait for it on the read RPC.
  const hash = await submitBaseRaw(BASE_SEQUENCER_RPC, signed)
    .catch(async (err) => {
      console.error('[evmTreasury] Base sequencer rejected the payout, sending through the read RPC', err);
      return submitBaseRaw(BASE_RPC, signed);
    });
  const receipt = await provider.waitForTransaction(hash, 1);
  if (!receipt) throw new Error('Base payout was not confirmed');
  return receipt.hash;
}

/** eth_sendRawTransaction only. A repeat of a transaction already in the pool still counts. */
async function submitBaseRaw(url: string, signed: string): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendRawTransaction',
      params: [signed],
    }),
  });
  const body = await response.json() as { result?: string; error?: { message?: string } };
  if (body.result) return body.result;
  const message = body.error?.message || 'Base payout was rejected';
  if (/already known/i.test(message)) return ethers.keccak256(signed);
  throw new Error(message);
}

export async function readEvmWalletBalance(network: EvmPlayNetwork, address: string): Promise<number> {
  const spec = EVM_CHAINS[network];
  const provider = rpcProvider(spec.rpc, spec.chainId);
  try {
    if (spec.token) {
      const token = new ethers.Contract(spec.token.address, TIP20_ABI, provider);
      const raw: bigint = await token.balanceOf(address);
      return Number(ethers.formatUnits(raw, spec.token.decimals));
    }
    const raw = await provider.getBalance(address);
    return Number(ethers.formatEther(raw));
  } finally {
    provider.destroy();
  }
}
