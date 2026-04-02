const normalizeLineBreaks = (value: string): string =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

export const toOmieTemplateDescription = (value: string): string => {
  const normalized = normalizeLineBreaks(value)
  return normalized.replace(/'/g, '&apos;').replace(/\n/g, '|')
}

export const fromOmieTemplateDescription = (value: string): string => {
  const normalized = normalizeLineBreaks(value)
  return normalized.replace(/\|/g, '\n').replace(/&apos;/g, "'")
}
