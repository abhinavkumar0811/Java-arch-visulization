// JVM Architecture Visualizer Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { enrichTrace } = require('./dryRunEnricher');
const { generateCustomVisualizer } = require('./aiVisualizer');

const app = express();

// Guaranteed CORS headers on all requests and errors
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Expose-Headers', 'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After']
}));
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));

// 1. Global limit for general endpoints (health checks, etc)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { ok: false, message: 'Too many requests overall. Please try again later.' },
  standardHeaders: false,
  legacyHeaders: false,
});
app.use(globalLimiter);

// 2. Execution limit for Java tracing
const executionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { ok: false, type: 'rate_limit', message: 'Execution rate limit exceeded (10 per minute).' },
});

// 3. AI Generation limit (Short-term burst protection)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  standardHeaders: false,
  legacyHeaders: false,
  message: { ok: false, type: 'rate_limit', message: 'AI generation limit exceeded (3 per minute).' },
});

// 4. AI Generation limit (Initial)
const dailyAiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 11, // Max 11 new generations per IP per day
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: { ok: false, type: 'rate_limit_daily', message: 'Daily AI generation limit reached (11 per day). Please try again tomorrow.' },
});

// 5. AI Regeneration limit (Retries)
const dailyRegenLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // Max 5 regenerations per IP per day
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: { ok: false, type: 'rate_limit_regen', message: 'Daily AI regeneration limit reached (5 per day). Please try again tomorrow.' },
});

app.post('/api/execute', executionLimiter, (req, res) => {
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

  const runTrace = () => {
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
  };

  if (!fs.existsSync(path.join(tempDir, 'TraceGenerator.class'))) {
    console.log("TraceGenerator.class not found. Compiling...");
    exec(`javac -g TraceGenerator.java`, { cwd: tempDir }, (err, stdout, stderr) => {
      if (err) {
        return res.status(200).json({ error: 'Backend Setup Error:\n' + stderr });
      }
      runTrace();
    });
  } else {
    runTrace();
  }
});

app.post('/api/dry-run', executionLimiter, (req, res) => {
  const { sourceCode } = req.body;
  if (typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return res.status(400).json({ ok: false, type: 'input_error', message: 'No source code provided.' });
  }

  const tempDir = __dirname;
  
  // Extract class name containing main method, default to Main
  const mainMatch = sourceCode.match(/class\s+(\w+)[^{]*\{[\s\S]*?public\s+static\s+void\s+main/);
  const mainClassName = mainMatch ? mainMatch[1] : 'Main';
  
  const javaFile = path.join(tempDir, `${mainClassName}.java`);
  const universalImports = "import java.util.*; import java.io.*; import java.math.*; import java.time.*;\n";
  const finalCode = universalImports + sourceCode;

  fs.writeFileSync(javaFile, finalCode);

  const runDryRun = () => {
    exec(`java TraceGenerator --serverless ${mainClassName}`, { cwd: tempDir, maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      let rawTrace = null;
      let bytecode = '';

      if (stdout && stdout.trim().startsWith('{')) {
        try {
          let salvaged = stdout.trim();
          if (!salvaged.endsWith('}')) salvaged += '\n  ]\n}';
          const parsed = JSON.parse(salvaged);
          rawTrace = parsed.trace;
          bytecode = parsed.bytecode || '';
        } catch (e) {
          // parse failed
        }
      }

      if (!rawTrace) {
        const errMsg = stderr || (err && err.message) || stdout || 'Unknown execution error';
        // Try to detect compile errors
        const isCompileError = errMsg.includes('error:') || errMsg.includes('cannot find symbol');
        const lineMatch = errMsg.match(/\.java:(\d+):/);
        return res.json({
          ok: false,
          type: isCompileError ? 'compile_error' : 'runtime_error',
          message: errMsg,
          line: lineMatch ? parseInt(lineMatch[1]) : null,
        });
      }

      // Enrich raw trace into DryRunStep[]
      const enrichedTrace = enrichTrace(rawTrace);

      // Detect complexity from trace metrics
      const lastStep = enrichedTrace[enrichedTrace.length - 1];
      const totalOps = lastStep?.metrics?.operations || enrichedTrace.length;
      const maxStack = lastStep?.metrics?.maxStackDepth || 1;

      res.json({
        ok: true,
        language: 'java',
        trace: enrichedTrace,
        bytecode,
        complexity: {
          measuredOps: totalOps,
          maxStackDepth: maxStack,
          traceSteps: enrichedTrace.length,
        },
      });
    });
  };

  if (!fs.existsSync(path.join(tempDir, 'TraceGenerator.class'))) {
    exec(`javac -g TraceGenerator.java`, { cwd: tempDir }, (err, stdout, stderr) => {
      if (err) return res.json({ ok: false, type: 'setup_error', message: stderr });
      runDryRun();
    });
  } else {
    runDryRun();
  }
});

app.post('/api/ai-visualize', dailyAiLimiter, aiLimiter, async (req, res) => {
  const { sourceCode, trace } = req.body;
  if (!sourceCode || typeof sourceCode !== 'string') {
    return res.status(400).json({ ok: false, message: 'Source code is required' });
  }

  try {
    const result = await generateCustomVisualizer({
      sourceCode,
      trace: Array.isArray(trace) ? trace : [],
      forceRegenerate: false
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('AI visualize error:', err);
    res.status(500).json({ ok: false, message: err.message || 'Failed to generate visualizer' });
  }
});

app.post('/api/ai-visualize/regenerate', dailyRegenLimiter, aiLimiter, async (req, res) => {
  const { sourceCode, trace } = req.body;
  if (!sourceCode || typeof sourceCode !== 'string') {
    return res.status(400).json({ ok: false, message: 'Source code is required' });
  }

  try {
    const result = await generateCustomVisualizer({
      sourceCode,
      trace: Array.isArray(trace) ? trace : [],
      forceRegenerate: true
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('AI visualize error:', err);
    res.status(500).json({ ok: false, message: err.message || 'Failed to regenerate visualizer' });
  }
});

app.get('/api/rate-limit-status', async (req, res) => {
  try {
    const key = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const record = await dailyAiLimiter.store.get(key);
    const totalHits = record ? record.totalHits : 0;
    const remaining = Math.max(0, 11 - totalHits);
    res.json({ ok: true, remaining });
  } catch (e) {
    res.json({ ok: true, remaining: 11 });
  }
});

app.get('/', (req, res) => res.json({ status: 'ok', message: 'JVM Architecture Visualizer API is running' }));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/healthz', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/api/health', (req, res) => res.json({ ok: true, status: 'ok' }));

const PORT = process.env.PORT || 80;
const server = app.listen(PORT, () => console.log(`JVM Visualizer API running on http://localhost:${PORT}`));

// Also listen on port 80 if PORT is set to 4000, so AWS ALB target group health checks always pass
if (Number(PORT) !== 80) {
  try {
    const http = require('http');
    const server80 = http.createServer(app);
    server80.on('error', (err) => {
      // Gracefully ignore if port 80 is unavailable or in use locally
    });
    server80.listen(80, () => {
      console.log(`JVM Visualizer API also listening on port 80 for AWS ALB`);
    });
  } catch (e) {}
}
