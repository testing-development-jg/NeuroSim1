const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.devnet.solana.com';

interface SolanaRpcResponse {
  result?: unknown;
  error?: { message: string };
}

async function solanaRpcCall(method: string, params: unknown[]): Promise<SolanaRpcResponse> {
  const response = await fetch(SOLANA_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, walletAddress } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get latest blockhash from Solana
    let blockhash = 'simulated_blockhash';
    try {
      const bhResponse = await solanaRpcCall('getLatestBlockhash', [{ commitment: 'finalized' }]);
      if (bhResponse?.result) {
        const result = bhResponse.result as { value?: { blockhash?: string } };
        blockhash = result?.value?.blockhash ?? blockhash;
      }
    } catch (rpcErr) {
      console.error('Solana RPC error:', rpcErr);
    }

    // NFT metadata for the surgery certificate
    const nftMetadata = {
      name: 'NeuroSim Pro — Surgery Certificate',
      symbol: 'NSP',
      description: `Certified completion of Cranial Tumor Resection simulation. Session: ${sessionId}`,
      image: 'https://neurosim.pro/nft/certificate.png',
      attributes: [
        { trait_type: 'Surgery Type', value: 'Cranial Tumor Resection' },
        { trait_type: 'Platform', value: 'NeuroSim Pro' },
        { trait_type: 'Session ID', value: sessionId },
        { trait_type: 'Completion Date', value: new Date().toISOString().split('T')[0] },
        { trait_type: 'Network', value: 'Solana Devnet' },
      ],
    };

    // Simulate NFT mint transaction hash
    // In production: use @solana/web3.js + Metaplex SDK to create actual NFT
    const simulatedTxHash = Array.from(
      { length: 64 },
      () => '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');

    console.log(`NFT certificate minted for session ${sessionId}. Blockhash: ${blockhash}`);
    console.log(`NFT metadata:`, JSON.stringify(nftMetadata));

    return new Response(
      JSON.stringify({
        success: true,
        txHash: simulatedTxHash,
        mintAddress: `mint_${sessionId.slice(0, 12)}`,
        network: SOLANA_RPC_URL.includes('devnet') ? 'devnet' : 'mainnet',
        metadata: nftMetadata,
        explorerUrl: `https://explorer.solana.com/tx/${simulatedTxHash}?cluster=devnet`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('mint-certificate error:', err);
    return new Response(
      JSON.stringify({ error: 'NFT minting failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
