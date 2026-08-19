# JVM Visualizer

A step-by-step visualizer for Java program execution, in the spirit of nodeloop.com's
event loop visualizer — but for the JVM's execution model: **Method Area, Heap, Call
Stack, and Threads**.

You write Java-subset code, click **Run**, and scrub/play through every step: class
loading, stack frame push/pop, variable declarations, heap allocation, field mutation,
print statements, branches, and (simplified) thread start/finish.

## How it actually works (read this before extending)

This is **not** a wrapper around a real JVM. It's a hand-written interpreter
(`backend/lib/lexer.js` → `parser.js` → `interpreter.js`) for a solid subset of Java:

- Classes with fields, constructors, methods (single inheritance via `extends`)
- Primitives, `String`, arithmetic/logical/comparison operators
- `if/else`, `while`, `for`, recursion
- `new ClassName(...)` → real heap allocation with an id, like the JVM
- `obj.method(...)`, `obj.field`, `this`
- `new Thread(() -> { ... }).start()` — simplified: the spawned thread runs to
  completion immediately (tagged with its own thread id/call stack) rather than truly
  interleaving with the caller. This keeps the visualization legible; see "Extending"
  below for how to do real interleaving.

Every state-changing action emits a trace event with a **full snapshot** of Method
Area / Heap / all thread call stacks / stdout at that instant. The frontend just steps
through this array — that's the entire "animation engine."

This gives you a *model-accurate*, genuinely-executing visualizer (like nodeloop.com
simulates the libuv event-loop model), not a full reimplementation of HotSpot. Real
bytecode/JIT/GC-algorithm fidelity would mean embedding an actual JVM — see below.

## Project layout

```
backend/    Express API. POST /api/execute { code } -> { trace: [...] }
  lib/lexer.js         tokenizer
  lib/parser.js        recursive-descent parser -> AST
  lib/interpreter.js   tree-walking interpreter + trace emitter
  test.js              a quick sanity script (node test.js)

frontend/   React + Vite app, styled after the reference screenshot
  src/App.jsx                 wires everything together, play/pause/scrub loop
  src/components/*.jsx        Method Area / Heap / Threads&Stack / Metrics / Console / Controls
  src/examples.js             a few built-in example programs
```

## Running it locally

```bash
# terminal 1
cd backend
npm install
npm start        # http://localhost:4000

# terminal 2
cd frontend
npm install
npm run dev       # http://localhost:5173 (proxies /api to :4000 via vite.config.js)
```

Open http://localhost:5173, pick an example (or write your own), hit **Run**, then use
the transport controls under the editor to step, scrub, or auto-play through execution.

`npm run build` in `frontend/` produces a static `dist/` you can deploy anywhere
(Vercel/Netlify/S3) — just point `VITE_API_BASE` at your deployed backend URL.

## Supported Java subset (today)

Works: classes/fields/constructors/methods, inheritance, `if/while/for`, recursion,
arithmetic/boolean/string ops, `new`, field/method access, `System.out.println/print`,
lambdas (`() -> {...}`), single-level `Thread`/`Runnable`.

Not yet supported: interfaces, generics (parsed but ignored), arrays beyond a basic
`new T[n]`, switch statements, exceptions (`try/catch` is parsed as a no-op path — not
wired into the interpreter yet), static fields shared across instances, real
multi-thread interleaving, and anything requiring the real Java standard library
(collections, streams, etc.).

## Extending toward "real" JVM fidelity

If you want this to go from *model simulation* to *actual bytecode-level accuracy*,
the natural upgrade path is:

1. **Real parsing**: swap the hand-rolled parser for `javac` + read the `.class` file,
   or use a library like `java-parser`/ANTLR's Java grammar, so you support 100% of
   the language instead of a curated subset.
2. **Real bytecode stepping**: run the compiled class under a real JVM and drive it
   with the **JDI (Java Debug Interface)** or **JVMTI** — attach as a debugger,
   single-step bytecode instructions, and read the actual heap/stack/thread state at
   each step via the debug protocol. This is how tools like Java Visualizer /
   IntelliJ's debugger work, and it would give you *ground-truth* accuracy (real GC,
   real thread interleaving, real JIT behavior) instead of a simulation.
3. Keep the current frontend almost as-is — it already just renders "the state at
   step N," so wiring it to a JDI-backed trace instead of this interpreter is mostly a
   backend swap, not a rewrite.

Given how much scope (2) alone is, I built the interpreter-based version first so you
have something working end-to-end today; happy to help you build the JDI-backed
version next if you want ground-truth bytecode fidelity for a portfolio/production
version.
