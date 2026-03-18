module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
 
  try {
    const response = await fetch(
      `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}/latest`,
      { headers: { 'X-Master-Key': process.env.JSONBIN_MASTER_KEY } }
    );
    if (!response.ok) throw new Error(`JSONBin error: ${response.status}`);
    const data = await response.json();
    const scores = (data.record.scores || [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    return res.status(200).json({ scores });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
 
