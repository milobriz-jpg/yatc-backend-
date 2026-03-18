module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  // Manual body parse — Vercel doesn't auto-parse JSON
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  if (!body && req.readable) {
    body = await new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', chunk => raw += chunk);
      req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { reject(); } });
      req.on('error', reject);
    }).catch(() => null);
  }
 
  const { playerId, name, score } = body || {};
  if (!playerId || !name || typeof score !== 'number') {
    return res.status(400).json({ error: 'Missing playerId, name, or score' });
  }
  if (score < 0 || score > 3600) {
    return res.status(400).json({ error: 'Score out of range' });
  }
 
  const BIN_URL = `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`;
  const HEADERS = {
    'X-Master-Key': process.env.JSONBIN_MASTER_KEY,
    'Content-Type': 'application/json',
  };
 
  try {
    // Read current scores
    const getRes = await fetch(`${BIN_URL}/latest`, { headers: HEADERS });
    if (!getRes.ok) throw new Error(`JSONBin read error: ${getRes.status}`);
    const data = await getRes.json();
    let scores = data.record.scores || [];
 
    // Keep one best score per playerId
    const existing = scores.findIndex(s => s.playerId === playerId);
    if (existing >= 0) {
      if (score > scores[existing].score) {
        scores[existing] = { playerId, name: name.substring(0, 16), score };
      } else {
        return res.status(200).json({ status: 'no_update', reason: 'not_a_new_best' });
      }
    } else {
      scores.push({ playerId, name: name.substring(0, 16), score });
    }
 
    // Sort and keep top 100
    scores = scores.sort((a, b) => b.score - a.score).slice(0, 100);
 
    // Write back
    const putRes = await fetch(BIN_URL, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({ scores }),
    });
    if (!putRes.ok) throw new Error(`JSONBin write error: ${putRes.status}`);
 
    return res.status(200).json({ status: 'ok' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
