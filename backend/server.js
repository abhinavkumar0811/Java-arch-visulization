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

  // 1. Compile Main.java and TraceGenerator.java with debug info
  exec(`javac -g Main.java TraceGenerator.java`, { cwd: tempDir }, (err, stdout, stderr) => {
    if (err) {
      return res.status(200).json({ error: 'Compilation Error:\n' + stderr });
    }

    // 2. Extract Bytecode using javap
    exec(`javap -c -p Main`, { cwd: tempDir }, (errJavap, stdoutJavap, stderrJavap) => {
      const bytecode = errJavap ? 'Failed to extract bytecode.' : stdoutJavap;

      // 3. Run TraceGenerator Main
      exec(`java TraceGenerator Main`, { cwd: tempDir, maxBuffer: 1024 * 1024 * 50 }, (err2, stdout2, stderr2) => {
        let trace = null;
        let salvageWarning = '';
        
        // Even if there's an error (e.g. exit code 1 or maxBuffer exceeded), we might still have a partial JSON trace!
        if (stdout2 && stdout2.trim().startsWith('[')) {
          try {
            let salvaged = stdout2.trim();
            if (salvaged.endsWith(',')) salvaged = salvaged.slice(0, -1);
            if (!salvaged.endsWith(']')) salvaged += '\n]';
            trace = JSON.parse(salvaged);
          } catch(e) {
            salvageWarning = '\n[Visualizer Note: Failed to salvage partial trace.]';
          }
        }
        
        if (err2 && !trace) {
          const errMsg = stderr2 ? stderr2 : (err2.message || 'Unknown Execution Error');
          return res.status(200).json({ error: 'Execution Error:\n' + errMsg + salvageWarning, bytecode });
        }
        
        if (!trace) {
          try {
            trace = JSON.parse(stdout2);
          } catch (e) {
             return res.status(200).json({ error: 'Failed to parse trace from Java helper:\n' + stdout2, bytecode });
          }
        }
        
        // If we salvaged a trace but there was an error, we can still show the error as a final step or in the console
        res.json({ trace, bytecode, error: err2 ? ('Execution Warning:\n' + (stderr2 || err2.message)) : null });
      });
    });
  });
});

app.get('/', (req, res) => res.json({ status: 'ok', message: 'JVM Architecture Visualizer API is running' }));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/healthz', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/api/health', (req, res) => res.json({ ok: true, status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`JVM Visualizer API running on http://localhost:${PORT}`));
