/**
 * Simple SQL formatter that adds line breaks before major clauses
 * for readability. Not a full parser — handles common SELECT queries.
 */

const CLAUSE_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'ORDER BY',
  'GROUP BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'JOIN',
  'ON',
  'UNION ALL',
  'UNION',
  'EXCEPT',
  'INTERSECT',
];

// Sort by length descending so multi-word keywords match first
const SORTED_KEYWORDS = [...CLAUSE_KEYWORDS].sort((a, b) => b.length - a.length);

interface Token {
  type: 'keyword' | 'string' | 'comment' | 'paren' | 'other';
  value: string;
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    // String literal
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let j = i + 2;
      while (j < sql.length && sql[j] !== '\n') j++;
      tokens.push({ type: 'comment', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Block comment
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let j = i + 2;
      while (j < sql.length - 1 && !(sql[j] === '*' && sql[j + 1] === '/')) j++;
      j += 2;
      tokens.push({ type: 'comment', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Parentheses
    if (sql[i] === '(' || sql[i] === ')') {
      tokens.push({ type: 'paren', value: sql[i] });
      i++;
      continue;
    }

    // Check for keyword match (case-insensitive, word boundary)
    const remaining = sql.slice(i);
    let matched = false;
    for (const kw of SORTED_KEYWORDS) {
      if (remaining.length >= kw.length) {
        const candidate = remaining.slice(0, kw.length);
        if (candidate.toUpperCase() === kw) {
          const charAfter = remaining[kw.length];
          const charBefore = i > 0 ? sql[i - 1] : ' ';
          const isWordBoundaryBefore = !charBefore || /[\s,;(]/.test(charBefore);
          const isWordBoundaryAfter = !charAfter || /[\s,;()]/.test(charAfter);
          if (isWordBoundaryBefore && isWordBoundaryAfter) {
            tokens.push({ type: 'keyword', value: candidate.toUpperCase() });
            i += kw.length;
            matched = true;
            break;
          }
        }
      }
    }
    if (matched) continue;

    // Accumulate other characters
    let j = i;
    while (j < sql.length) {
      if (sql[j] === "'" || sql[j] === '(' || sql[j] === ')') break;
      if (sql[j] === '-' && sql[j + 1] === '-') break;
      if (sql[j] === '/' && sql[j + 1] === '*') break;

      // Check if next position starts a keyword
      const rem = sql.slice(j);
      let isKw = false;
      for (const kw of SORTED_KEYWORDS) {
        if (rem.length >= kw.length) {
          const cand = rem.slice(0, kw.length);
          if (cand.toUpperCase() === kw) {
            const ca = rem[kw.length];
            const cb = j > 0 ? sql[j - 1] : ' ';
            if ((!cb || /[\s,;(]/.test(cb)) && (!ca || /[\s,;()]/.test(ca))) {
              isKw = true;
              break;
            }
          }
        }
      }
      if (isKw) break;
      j++;
    }
    if (j > i) {
      tokens.push({ type: 'other', value: sql.slice(i, j) });
      i = j;
    }
  }

  return tokens;
}

// Keywords that get their own line (not indented further)
const MAJOR_CLAUSE = new Set(['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT']);
// Keywords that get indented under their parent clause
const SUB_CLAUSE = new Set(['AND', 'OR', 'ON']);
// JOINs get their own line at base indent
const JOIN_CLAUSE = new Set(['JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN']);

export function formatSql(sql: string): string {
  const tokens = tokenize(sql.trim());
  const parts: string[] = [];
  let depth = 0;

  const indent = (d: number) => '  '.repeat(d);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'paren') {
      if (token.value === '(') {
        parts.push('(');
        depth++;
      } else {
        depth = Math.max(0, depth - 1);
        parts.push(')');
      }
      continue;
    }

    if (token.type === 'keyword' && depth === 0) {
      if (MAJOR_CLAUSE.has(token.value)) {
        // Start a new line for major clauses
        if (parts.length > 0) parts.push('\n');
        parts.push(token.value);
      } else if (JOIN_CLAUSE.has(token.value)) {
        parts.push('\n');
        parts.push(token.value);
      } else if (SUB_CLAUSE.has(token.value)) {
        parts.push('\n');
        parts.push(indent(1) + token.value);
      } else {
        parts.push(token.value);
      }
      continue;
    }

    if (token.type === 'keyword' && depth > 0) {
      // Inside parens, keep inline but add newlines for major clauses
      if (MAJOR_CLAUSE.has(token.value)) {
        parts.push('\n' + indent(depth) + token.value);
      } else if (SUB_CLAUSE.has(token.value)) {
        parts.push('\n' + indent(depth + 1) + token.value);
      } else {
        parts.push(token.value);
      }
      continue;
    }

    // String, comment, or other — add as-is but trim excess whitespace
    const trimmed = token.value.replace(/\s+/g, ' ');
    parts.push(trimmed);
  }

  // Join and clean up: collapse multiple spaces, trim lines
  return parts.join('')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}
