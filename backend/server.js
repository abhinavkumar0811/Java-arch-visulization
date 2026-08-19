const express = require('express');
const cors = require('cors');
const { interpret } = require('./lib/interpreter');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.post('/api/execute', (req, res) => {
  const { code } = req.body;
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'No code provided.' });
  }
  try {
    const trace = interpret(code);
    res.json({ trace });
  } catch (e) {
    res.status(200).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`JVM Visualizer API running on http://localhost:${PORT}`));
