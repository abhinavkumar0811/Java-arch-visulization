/**
 * Detects if source code is written in a non-Java language (C/C++, Python, JS, etc.)
 * Returns { isSupported: boolean, detectedLanguage?: string, message?: string, quickFixTip?: string }
 */
export function validateJavaCode(code) {
  if (!code || !code.trim()) {
    return { isSupported: true };
  }

  const trimmed = code.trim();

  // 1. Check for C / C++ patterns
  const isC_Cpp = 
    /^\s*#\s*include\b/m.test(trimmed) ||
    /^\s*#\s*define\b/m.test(trimmed) ||
    /\b(std::|printf\s*\(|scanf\s*\(|cout\s*<<|cin\s*>>|malloc\s*\(|free\s*\(|using\s+namespace\s+std)\b/.test(trimmed) ||
    (/\bstruct\s+\w+\s*\{/.test(trimmed) && !/\bclass\s+\w+/.test(trimmed));

  if (isC_Cpp) {
    return {
      isSupported: false,
      detectedLanguage: 'C / C++',
      message: "JavaFlow currently supports Java only. C / C++ syntax (#include, struct, printf, etc.) cannot be executed by the JVM engine.",
      quickFixTip: "Convert your code into a Java class: `public class Main { public static void main(String[] args) { ... } }`"
    };
  }

  // 2. Check for Python patterns
  const isPython = 
    /^\s*def\s+\w+\s*\(.*?\)\s*:/m.test(trimmed) ||
    /^\s*(import\s+(math|sys|os|numpy|pandas)|from\s+\w+\s+import)/m.test(trimmed) ||
    /\belif\b/.test(trimmed) ||
    /\bif\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(trimmed) ||
    (/\bprint\s*\(/.test(trimmed) && !/\bSystem\.out\.print/.test(trimmed) && !/\bclass\s+\w+/.test(trimmed));

  if (isPython) {
    return {
      isSupported: false,
      detectedLanguage: 'Python',
      message: "JavaFlow currently supports Java only. Python syntax is not supported by the Java Virtual Machine visualizer.",
      quickFixTip: "Wrap your algorithm in a Java class with typed variables and standard Java methods."
    };
  }

  // 3. Check for JavaScript / TypeScript patterns
  const isJS = 
    /\bconsole\.(log|error|warn)\s*\(/.test(trimmed) ||
    /^\s*function\s+\w+\s*\(.*?\)\s*\{/m.test(trimmed) ||
    /\b(export\s+default|export\s+const|module\.exports|require\s*\()\b/.test(trimmed) ||
    (/\b(const|let|var)\s+\w+\s*=/.test(trimmed) && !/\b(class|public|private|static)\b/.test(trimmed));

  if (isJS) {
    return {
      isSupported: false,
      detectedLanguage: 'JavaScript / TypeScript',
      message: "JavaFlow currently supports Java only. JavaScript / TypeScript is not supported.",
      quickFixTip: "Use Java typed syntax inside a class: `class Main { public static void main(String[] args) { ... } }`"
    };
  }

  // 4. Check for Rust / Go / C# / PHP
  if (/^\s*fn\s+main\s*\(/m.test(trimmed) || /\blet\s+mut\b/.test(trimmed)) {
    return {
      isSupported: false,
      detectedLanguage: 'Rust',
      message: "JavaFlow currently supports Java only. Rust is not supported."
    };
  }

  if (/^\s*package\s+main\b/m.test(trimmed) || /^\s*func\s+main\s*\(/m.test(trimmed)) {
    return {
      isSupported: false,
      detectedLanguage: 'Go',
      message: "JavaFlow currently supports Java only. Go is not supported."
    };
  }

  if (/^\s*using\s+System\b/m.test(trimmed)) {
    return {
      isSupported: false,
      detectedLanguage: 'C#',
      message: "JavaFlow currently supports Java only. C# (.NET) is not supported."
    };
  }

  // 5. General Java structure check (code has no class / interface / enum / record at all)
  const hasJavaContainer = /\b(class|interface|enum|record)\s+\w+/.test(trimmed);
  if (!hasJavaContainer) {
    const looksLikeBareStatements = /^\s*(int|double|float|long|boolean|char|String)\s+\w+/m.test(trimmed);
    if (!looksLikeBareStatements) {
      return {
        isSupported: false,
        detectedLanguage: 'Non-Java',
        message: "JavaFlow currently supports Java only. No Java class declaration was found.",
        quickFixTip: "Java requires code to be enclosed in a class: `class Main { public static void main(String[] args) { ... } }`"
      };
    }
  }

  return { isSupported: true };
}

/**
 * Checks if a compiler error message suggests that the user typed non-Java code.
 */
export function checkNonJavaError(errorMessage, code) {
  if (!errorMessage) return null;

  const validation = validateJavaCode(code);
  if (!validation.isSupported) {
    return validation;
  }

  // Check for telltale javac error outputs when C or script code is compiled
  if (
    errorMessage.includes("illegal character: '#'") ||
    errorMessage.includes("#include") ||
    (errorMessage.includes("class, interface, enum, or record expected") && !/\bclass\s+\w+/.test(code || ''))
  ) {
    return {
      isSupported: false,
      detectedLanguage: 'Non-Java',
      message: "JavaFlow currently supports Java only. Detected non-Java syntax (like C/C++ directives or missing Java class structures).",
      quickFixTip: "Please provide valid Java source code with `class Main { public static void main(String[] args) { ... } }`."
    };
  }

  return null;
}
