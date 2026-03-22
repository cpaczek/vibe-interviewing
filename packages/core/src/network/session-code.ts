import { VibeError } from '../errors.js'

/**
 * Encode a host:port pair into a human-typeable session code.
 *
 * Format: VIBE-XXXXXXXXXX (10 base36 chars encoding 6 bytes: 4 IP octets + 2 port bytes)
 */
export function encodeSessionCode(host: string, port: number): string {
  const octets = host.split('.').map(Number)
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    throw new InvalidSessionCodeError(`Invalid IPv4 address: ${host}`)
  }
  if (port < 1 || port > 65535) {
    throw new InvalidSessionCodeError(`Invalid port: ${port}`)
  }

  // Pack into 6 bytes: [ip0, ip1, ip2, ip3, port_hi, port_lo]
  const buf = Buffer.alloc(6)
  buf[0] = octets[0]!
  buf[1] = octets[1]!
  buf[2] = octets[2]!
  buf[3] = octets[3]!
  buf.writeUInt16BE(port, 4)

  // Convert to base36, zero-pad to 10 chars
  const num = buf.readUIntBE(0, 6)
  const code = num.toString(36).toUpperCase().padStart(10, '0')

  return `VIBE-${code}`
}

/**
 * Decode a session code back to host:port.
 *
 * Accepts formats: VIBE-XXXXXXXXXX, vibe-xxxxxxxxxx, or just XXXXXXXXXX
 */
export function decodeSessionCode(code: string): { host: string; port: number } {
  // Strip VIBE- prefix if present
  let raw = code.trim().toUpperCase()
  if (raw.startsWith('VIBE-')) {
    raw = raw.slice(5)
  }

  if (!/^[0-9A-Z]{1,10}$/.test(raw)) {
    throw new InvalidSessionCodeError(`Invalid session code format: ${code}`)
  }

  const num = parseInt(raw, 36)
  if (isNaN(num) || num > 0xffffffffffff) {
    throw new InvalidSessionCodeError(`Invalid session code: ${code}`)
  }

  const buf = Buffer.alloc(6)
  // Write as 6-byte big-endian
  buf.writeUIntBE(num, 0, 6)

  const host = `${buf[0]}.${buf[1]}.${buf[2]}.${buf[3]}`
  const port = buf.readUInt16BE(4)

  if (port === 0) {
    throw new InvalidSessionCodeError(`Invalid session code (port 0): ${code}`)
  }

  return { host, port }
}

/** Error for invalid session codes */
export class InvalidSessionCodeError extends VibeError {
  constructor(message: string) {
    super(message, 'INVALID_SESSION_CODE', 'Session codes look like VIBE-XXXXXXXXXX')
  }
}
