// Genera un código de sala corto y legible (estilo Kahoot)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin caracteres ambiguos

export function generateRoomCode(length = 5): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}
