/**
 * Parser leve de conteúdo estilo .env (uma linha = KEY=VALUE).
 * Ignora vazios, comentários # e linhas export KEY=...
 */

const LINE_KEY_VALUE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/s

export type ParsedEnvEntry = { key: string; value: string }

export type ParseDotenvError = { lineNumber: number; line: string; reason: string }

export type ParseDotenvResult = {
  entries: ParsedEnvEntry[]
  errors: ParseDotenvError[]
  skippedLines: number
}

function unquoteValue(raw: string): string {
  const t = raw.trim()
  if (t.length >= 2) {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1)
    }
  }
  return t
}

export function parseDotenvContent(text: string): ParseDotenvResult {
  const entries: ParsedEnvEntry[] = []
  const errors: ParseDotenvError[] = []
  let skippedLines = 0

  const lines = text.split(/\r?\n/)
  const merged: string[] = []
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i] ?? ''
    while (line.endsWith('\\') && i + 1 < lines.length) {
      line = line.slice(0, -1) + '\n' + (lines[++i] ?? '')
    }
    merged.push(line)
  }

  merged.forEach((line, idx) => {
    const lineNumber = idx + 1
    const trimmed = line.trim()
    if (trimmed === '') {
      skippedLines++
      return
    }
    if (trimmed.startsWith('#')) {
      skippedLines++
      return
    }

    const m = line.match(LINE_KEY_VALUE)
    if (!m) {
      errors.push({
        lineNumber,
        line: trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed,
        reason: 'Formato esperado: CHAVE=valor',
      })
      return
    }

    const key = m[1] ?? ''
    const valuePart = m[2] ?? ''
    entries.push({ key, value: unquoteValue(valuePart) })
  })

  return { entries, errors, skippedLines }
}

export function buildDotenvFile(entries: Array<{ key: string; value: string }>): string {
  return entries
    .filter((e) => e.key.trim() !== '')
    .map((e) => {
      const k = e.key.trim()
      const v = e.value
      const needsQuote = /[\s#"'\\]/.test(v) || v.includes('\n')
      if (needsQuote) {
        const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
        return `${k}="${escaped}"`
      }
      return `${k}=${v}`
    })
    .join('\n')
}
