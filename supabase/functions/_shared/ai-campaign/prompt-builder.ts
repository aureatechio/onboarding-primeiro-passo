export const PROMPT_VERSION = 'v1.1.1'
export const GLOBAL_RULES_VERSION = 'v1.1.1'

export const GROUPS = ['moderna', 'clean', 'retail'] as const
export const FORMATS = ['1:1', '4:5', '16:9', '9:16'] as const

export type GroupName = (typeof GROUPS)[number]
export type FormatName = (typeof FORMATS)[number]

const GROUP_DIRECTIONS: Record<GroupName, string> = {
  moderna: `CREATIVE DIRECTION — MODERNA (Dark & Bold)
- Background: Black / dark solid.
- Celebrity: Hero framing, 70-80% of the frame, cinematic lighting.
- Layout: Asymmetric, photo dominates, text anchored at the bottom.
- Typography: Ultra-bold condensed, impactful, max contrast.
- Reference mood: Nike campaign poster / movie poster aesthetic.`,
  clean: `CREATIVE DIRECTION — CLEAN (White & Editorial)
- Background: Pure white.
- Celebrity: Clean photo floating on white, positioned at the right side.
- Layout: Editorial split 30/70 with a text column on the left.
- Typography: Light or regular serif/sans-serif with generous whitespace.
- Reference mood: Vogue editorial / Apple product ad aesthetic.`,
  retail: `CREATIVE DIRECTION — RETAIL (Bold & Commercial)
- Background: Solid brand color.
- Celebrity: Cut-out standing, right side, breaking out of the frame.
- Layout: Hard geometric blocks, badges, price callouts if applicable.
- Typography: All-caps condensed, maximum contrast, scannable CTA.
- Reference mood: Casas Bahia / Magazine Luiza promotional ad aesthetic.`,
}

const FORMAT_INSTRUCTIONS: Record<FormatName, string> = {
  '1:1': 'OUTPUT FORMAT: Square 1:1 (1080x1080 px). Centered composition.',
  '4:5': 'OUTPUT FORMAT: Portrait 4:5 (1080x1350 px). Vertical emphasis, CTA at bottom.',
  '16:9': 'OUTPUT FORMAT: Landscape 16:9 (1920x1080 px). Horizontal layout, text on left, celebrity on right.',
  '9:16': 'OUTPUT FORMAT: Vertical Story 9:16 (1080x1920 px). Full vertical, celebrity top, text/CTA bottom third.',
}

export interface PromptInput {
  globalRules: string
  clientName: string
  celebName: string
  brandPalette: string[]
  fontChoice: string
  campaignNotes?: string
}

export interface PromptOverrides {
  groupDirections?: Record<GroupName, string>
  formatInstructions?: Record<FormatName, string>
}

export function buildPrompt(
  input: PromptInput,
  group: GroupName,
  format: FormatName,
  overrides?: PromptOverrides
): string {
  const gd = overrides?.groupDirections ?? GROUP_DIRECTIONS
  const fi = overrides?.formatInstructions ?? FORMAT_INSTRUCTIONS

  const sections = [
    input.globalRules,
    '',
    '---',
    '',
    `## CLIENT BRIEF`,
    `- Company: ${input.clientName}`,
    `- Celebrity: ${input.celebName}`,
    `- Brand Colors: ${input.brandPalette.join(', ')}`,
    `- Font: ${input.fontChoice}`,
  ]

  if (input.campaignNotes?.trim()) {
    sections.push(`- Additional Notes: ${input.campaignNotes.trim()}`)
  }

  sections.push('', '---', '')
  sections.push(gd[group])
  sections.push('', '---', '')
  sections.push(fi[format])
  sections.push('', '---', '')
  sections.push(
    'IMPORTANT: Generate a single, high-quality commercial advertising image following ALL the rules above. The celebrity photo MUST remain 100% untouched. All text MUST be in Brazilian Portuguese.'
  )

  return sections.join('\n')
}

export { GROUP_DIRECTIONS, FORMAT_INSTRUCTIONS }

export async function computeInputHashAsync(
  input: PromptInput,
  campaignImageUrl?: string,
  referenceSignature?: string
): Promise<string> {
  const canonical = JSON.stringify({
    clientName: input.clientName,
    celebName: input.celebName,
    brandPalette: [...input.brandPalette].sort(),
    fontChoice: input.fontChoice,
    campaignNotes: input.campaignNotes?.trim() || '',
    campaignImageUrl: campaignImageUrl?.trim() || '',
    referenceSignature: referenceSignature?.trim() || '',
    promptVersion: PROMPT_VERSION,
    globalRulesVersion: GLOBAL_RULES_VERSION,
  })
  const encoder = new TextEncoder()
  const data = encoder.encode(canonical)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
