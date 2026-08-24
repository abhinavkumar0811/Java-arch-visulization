const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));

app.post('/api/execute', (req, res) => {
  const { code } = req.body;
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'No code provided.' });
  }
  
  const tempDir = __dirname;
  const javaFile = path.join(tempDir, 'Main.java');
  
  // Prepend universal imports on the same line so line numbers are not shifted
  const universalImports = "import java.util.*; import java.io.*; import java.math.*; import java.time.*; ";
  const finalCode = universalImports + code;
  
  fs.writeFileSync(javaFile, finalCode);

  // 1. Run TraceGenerator in serverless mode (compiles, extracts bytecode, and traces in a single JVM)
  exec(`java TraceGenerator --serverless Main`, { cwd: tempDir, maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
    let trace = null;
    let bytecode = "Failed to extract bytecode.";
    let salvageWarning = '';
    
    if (stdout && stdout.trim().startsWith('{')) {
      try {
        let salvaged = stdout.trim();
        // The serverless output is a single JSON object: { "bytecode": "...", "trace": [ ... ] }
        if (!salvaged.endsWith('}')) {
           // Basic salvage attempt if truncated
           salvaged += '\n  ]\n}';
        }
        const parsed = JSON.parse(salvaged);
        trace = parsed.trace;
        bytecode = parsed.bytecode;
      } catch(e) {
        salvageWarning = '\n[Visualizer Note: Failed to parse trace.]';
      }
    }
    
    if (err && !trace) {
      const errMsg = stderr ? stderr : (err.message || 'Unknown Execution Error');
      return res.status(200).json({ error: 'Execution Error:\n' + errMsg + salvageWarning, bytecode });
    }
    
    if (!trace) {
       return res.status(200).json({ error: 'Failed to parse trace from Java helper:\n' + stdout, bytecode });
    }
    
    res.json({ trace, bytecode, error: err ? ('Execution Warning:\n' + (stderr || err.message)) : null });
  });
});

app.get('/', (req, res) => res.json({ status: 'ok', message: 'JVM Architecture Visualizer API is running' }));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/healthz', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/api/health', (req, res) => res.json({ ok: true, status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`JVM Visualizer API running on http://localhost:${PORT}`));
