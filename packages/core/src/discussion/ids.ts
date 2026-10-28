const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** `d-` or `c-` and 10 base-36 characters, so two authors rarely pick the same id. */
export function randomDiscussionId(prefix: 'd' | 'c'): string {
  const bytes = new Uint8Array(10)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  let body = ''
  for (const byte of bytes) body += ALPHABET[byte % ALPHABET.length]
  return `${prefix}-${body}`
}
