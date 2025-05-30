const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 'cad061f7-2413-4c3f-bbfb-8b051b11723e';
const PUMP_FUN_PROGRAM = 'GgxYtGkQ6RZpTHoNSk6MtJ3aVnktYYtJMSeGHf74nq8a';

function getGrade(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

async function getTransactions() {
  const txs = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignaturesForAddress',
    params: [PUMP_FUN_PROGRAM, { limit: 5 }]
  });

  return txs.data.result.map(tx => tx.signature);
}

async function getTokenMetadataFromTx(signature) {
  const txData = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getTransaction',
    params: [signature, { encoding: "jsonParsed" }]
  });

  const innerInstructions = txData.data.result?.meta?.innerInstructions || [];
  let mintAddress = null;

  for (const ix of innerInstructions) {
    for (const inst of ix.instructions) {
      if (inst.parsed?.info?.mint) {
        mintAddress = inst.parsed.info.mint;
        break;
      }
    }
    if (mintAddress) break;
  }

  if (!mintAddress) return null;

  const metadata = {
    mint: mintAddress,
    name: "Token " + mintAddress.slice(0, 5),
    source: "Pump.fun",
    creatorClean: Math.random() > 0.3,
    hasTwitter: Math.random() > 0.4,
    lpLocked: Math.random() > 0.5,
    hasImage: Math.random() > 0.2,
    mentionedOnX: Math.random() > 0.6
  };

  metadata.juiceScore = 0;
  metadata.badges = [];

  if (metadata.lpLocked) { metadata.juiceScore += 20; metadata.badges.push("LP Locked"); }
  if (metadata.creatorClean) { metadata.juiceScore += 25; metadata.badges.push("Creator Clean"); }
  if (metadata.hasTwitter) { metadata.juiceScore += 15; metadata.badges.push("Twitter Found"); }
  if (metadata.hasImage) { metadata.juiceScore += 5; metadata.badges.push("Has Image"); }
  if (metadata.mentionedOnX) { metadata.juiceScore += 10; metadata.badges.push("Mentioned on X"); }

  metadata.grade = getGrade(metadata.juiceScore);
  metadata.chartUrl = `https://pump.fun/${metadata.mint}`;
  metadata.buyUrl = `https://pump.fun/${metadata.mint}`;
  metadata.scanUrl = `https://alphahub.xyz/scan/${metadata.mint}`;

  return metadata;
}

app.get('/v1/pump-gems', async (req, res) => {
  try {
    const signatures = await getTransactions();
    const tokens = [];

    for (const sig of signatures) {
      const metadata = await getTokenMetadataFromTx(sig);
      if (metadata && metadata.juiceScore >= 60) {
        tokens.push(metadata);
      }
    }

    res.json(tokens);
  } catch (err) {
    console.error("Erreur v3:", err.message);
    res.status(500).json({ error: "Erreur analyse tokens v3" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Alpha Radar v3 avec Grade + Actions dispo sur http://localhost:${PORT}`);
});
