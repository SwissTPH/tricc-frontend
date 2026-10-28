/** A comment drawn as text, a link, or a name chip. Never HTML. */
export type TextPart =
  | { type: 'text'; text: string }
  | { type: 'link'; href: string }
  | { type: 'mention'; id: string; name: string }

const TOKEN = /@\[([^\]]+)\]\(user:([^)\s]+)\)|(https?:\/\/[^\s<]+|mailto:[^\s<]+)/g

/** Plain text, with web addresses and platform tags picked out. `@Bob` stays text. */
export function parseCommentText(text: string): TextPart[] {
  const parts: TextPart[] = []
  let cursor = 0
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0
    if (index > cursor) parts.push({ type: 'text', text: text.slice(cursor, index) })
    if (match[1] !== undefined && match[2] !== undefined) {
      parts.push({ type: 'mention', name: match[1], id: match[2] })
    } else if (match[3]) {
      const href = trimLink(match[3])
      parts.push({ type: 'link', href })
      const dropped = match[3].length - href.length
      if (dropped > 0) parts.push({ type: 'text', text: match[3].slice(href.length) })
    }
    cursor = index + match[0].length
  }
  if (cursor < text.length) parts.push({ type: 'text', text: text.slice(cursor) })
  return mergeText(parts)
}

function mergeText(parts: TextPart[]): TextPart[] {
  const merged: TextPart[] = []
  for (const part of parts) {
    const previous = merged.at(-1)
    if (part.type === 'text' && previous?.type === 'text') previous.text += part.text
    else merged.push(part)
  }
  return merged
}

function trimLink(href: string): string {
  return href.replace(/[),.;:!?]+$/g, '')
}
