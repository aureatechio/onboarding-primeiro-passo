import { describe, expect, it } from 'vitest'
import { buildDotenvFile, parseDotenvContent } from '@/lib/parseDotenv'

describe('parseDotenvContent', () => {
  it('parseia linha simples', () => {
    const r = parseDotenvContent('FOO=bar')
    expect(r.entries).toEqual([{ key: 'FOO', value: 'bar' }])
    expect(r.errors).toHaveLength(0)
  })

  it('aceita export', () => {
    const r = parseDotenvContent('export API_KEY=secret')
    expect(r.entries).toEqual([{ key: 'API_KEY', value: 'secret' }])
  })

  it('ignora vazios e comentários', () => {
    const r = parseDotenvContent(`
# c
FOO=1

BAR=two
`)
    expect(r.entries).toEqual([
      { key: 'FOO', value: '1' },
      { key: 'BAR', value: 'two' },
    ])
    expect(r.skippedLines).toBeGreaterThan(0)
  })

  it('quebra só no primeiro =', () => {
    const r = parseDotenvContent('EQ=a=b=c')
    expect(r.entries).toEqual([{ key: 'EQ', value: 'a=b=c' }])
  })

  it('remove aspas duplas externas', () => {
    const r = parseDotenvContent('X="hello world"')
    expect(r.entries).toEqual([{ key: 'X', value: 'hello world' }])
  })

  it('última chave duplicada no texto permanece duplicada no array (UI pode mesclar)', () => {
    const r = parseDotenvContent('A=1\nA=2')
    expect(r.entries).toEqual([
      { key: 'A', value: '1' },
      { key: 'A', value: '2' },
    ])
  })

  it('marca linha inválida', () => {
    const r = parseDotenvContent('not-a-line')
    expect(r.entries).toHaveLength(0)
    expect(r.errors.length).toBe(1)
  })
})

describe('buildDotenvFile', () => {
  it('monta arquivo com aspas quando necessário', () => {
    const s = buildDotenvFile([{ key: 'K', value: 'a b' }])
    expect(s).toBe('K="a b"')
  })

  it('sem aspas quando valor simples', () => {
    expect(buildDotenvFile([{ key: 'K', value: 'v' }])).toBe('K=v')
  })
})
