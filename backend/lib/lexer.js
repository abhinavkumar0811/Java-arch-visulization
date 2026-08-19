// Tokenizer for the supported Java subset.
const KEYWORDS = new Set([
  'class', 'public', 'private', 'protected', 'static', 'final', 'void',
  'int', 'double', 'float', 'long', 'boolean', 'char', 'String',
  'new', 'return', 'if', 'else', 'while', 'for', 'true', 'false', 'null',
  'this', 'Thread', 'Runnable', 'System', 'out', 'println', 'print',
  'try', 'catch', 'finally', 'throw', 'extends'
]);

const PUNCT = [
  '<<=', '>>=', '===', '!==', '&&', '||', '==', '!=', '<=', '>=', '++', '--',
  '+=', '-=', '*=', '/=', '%=', '->', '(', ')', '{', '}', '[', ']', ';', ',',
  '.', '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', ':'
];

function tokenize(src) {
  const tokens = [];
  let i = 0, line = 1;
  const n = src.length;

  while (i < n) {
    const c = src[i];

    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }

    // line comment
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    // block comment
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        i++;
      }
      i += 2;
      continue;
    }

    // string literal
    if (c === '"') {
      let j = i + 1, str = '';
      while (j < n && src[j] !== '"') {
        if (src[j] === '\\') {
          const next = src[j + 1];
          const map = { n: '\n', t: '\t', '"': '"', '\\': '\\' };
          str += map[next] !== undefined ? map[next] : next;
          j += 2;
        } else {
          str += src[j];
          j++;
        }
      }
      tokens.push({ type: 'STRING', value: str, line });
      i = j + 1;
      continue;
    }

    // char literal
    if (c === "'") {
      let j = i + 1, str = '';
      while (j < n && src[j] !== "'") {
        if (src[j] === '\\') { str += src[j + 1]; j += 2; }
        else { str += src[j]; j++; }
      }
      tokens.push({ type: 'CHAR', value: str, line });
      i = j + 1;
      continue;
    }

    // number
    if (/[0-9]/.test(c)) {
      let j = i, num = '';
      while (j < n && /[0-9.]/.test(src[j])) { num += src[j]; j++; }
      tokens.push({ type: 'NUMBER', value: parseFloat(num), line });
      i = j;
      continue;
    }

    // identifier / keyword
    if (/[A-Za-z_$]/.test(c)) {
      let j = i, id = '';
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) { id += src[j]; j++; }
      tokens.push({ type: KEYWORDS.has(id) ? 'KEYWORD' : 'IDENT', value: id, line });
      i = j;
      continue;
    }

    // punctuation (longest match first)
    let matched = null;
    for (const p of PUNCT) {
      if (src.startsWith(p, i)) { matched = p; break; }
    }
    if (matched) {
      tokens.push({ type: 'PUNCT', value: matched, line });
      i += matched.length;
      continue;
    }

    // annotation - skip @Something
    if (c === '@') {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
      i = j;
      continue;
    }

    throw new Error(`Unexpected character '${c}' at line ${line}`);
  }

  tokens.push({ type: 'EOF', value: null, line });
  return tokens;
}

module.exports = { tokenize };
