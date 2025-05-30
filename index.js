
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 'cad061f7-2413-4c3f-bbfb-8b051b11723e';
const PUMP_FUN_PROGRAM = 'GgkYEtbGK6RZpTTohSNk6MtJ3aVnktYYtJfSGeHF74nq8a';

function getGrade(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

async function getTransactions() {
  try {
    const txs = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [PUMP_FUN_PROGRAM, { limit: 20 }]
    });

    return txs.data?.result?.map(tx => tx.signature) || [];
  } catch (err) {
    console.error("Erreur lors de la récupération des transactions :", err.message);
    return [];
  }
}

async function getTokenMetadataFromTx(signature) {
  try {
    const txData = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: [signature, { maxSupportedTransactionVersion: 0 }]
    });

    const instructions = txData.data?.result?.transaction?.message?.instructions || [];

    const first = instructions.find(i =>
      i?.parsed &&
      typeof i.parsed.name === 'string' &&
      typeof i.parsed.symbol === 'string'
    );

    if (!first || !first.parsed) return null;

    const { name, symbol, uri, info } = first.parsed;

    return {
      mint: info?.mint || "unknown",
      name,
      symbol,
      uri,
      juiceScore: Math.floor(Math.random() * 100),
      grade: getGrade(Math.floor(Math.random() * 100))
    };
  } catch (e) {
    console.error(`Erreur lors de la lecture de ${signature}: ${e.message}`);
    return null;
  }
}

app.get('/v1/pump-gems', async (req, res) => {
  try {
    const signatures = await getTransactions();
    const tokens = [];

    for (const sig of signatures) {
      const metadata = await getTokenMetadataFromTx(sig);
      if (metadata) {
        tokens.push(metadata);
      }
    }

    console.log(`✅ ${tokens.length} tokens détectés.`);
    res.json(tokens);
  } catch (err) {
    console.error("Erreur serveur générale :", err.message);
    res.status(500).send("Erreur serveur");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
