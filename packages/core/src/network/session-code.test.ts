import { describe, it, expect } from 'vitest'
import { encodeSessionCode, decodeSessionCode, InvalidSessionCodeError } from './session-code.js'

describe('session-code', () => {
  describe('roundtrip', () => {
    it('encodes and decodes 192.168.1.100:3000', () => {
      const code = encodeSessionCode('192.168.1.100', 3000)
      expect(code).toMatch(/^VIBE-[0-9A-Z]{10}$/)
      const decoded = decodeSessionCode(code)
      expect(decoded).toEqual({ host: '192.168.1.100', port: 3000 })
    })

    it('encodes and decodes 10.0.0.1:8080', () => {
      const code = encodeSessionCode('10.0.0.1', 8080)
      const decoded = decodeSessionCode(code)
      expect(decoded).toEqual({ host: '10.0.0.1', port: 8080 })
    })

    it('encodes and decodes 0.0.0.0:1', () => {
      const code = encodeSessionCode('0.0.0.0', 1)
      const decoded = decodeSessionCode(code)
      expect(decoded).toEqual({ host: '0.0.0.0', port: 1 })
    })

    it('encodes and decodes 255.255.255.255:65535', () => {
      const code = encodeSessionCode('255.255.255.255', 65535)
      const decoded = decodeSessionCode(code)
      expect(decoded).toEqual({ host: '255.255.255.255', port: 65535 })
    })
  })

  describe('encodeSessionCode', () => {
    it('throws for invalid IP', () => {
      expect(() => encodeSessionCode('not.an.ip.address', 3000)).toThrow(InvalidSessionCodeError)
    })

    it('throws for invalid port', () => {
      expect(() => encodeSessionCode('192.168.1.1', 0)).toThrow(InvalidSessionCodeError)
      expect(() => encodeSessionCode('192.168.1.1', 70000)).toThrow(InvalidSessionCodeError)
    })
  })

  describe('decodeSessionCode', () => {
    it('handles VIBE- prefix', () => {
      const code = encodeSessionCode('192.168.1.1', 4000)
      const decoded = decodeSessionCode(code)
      expect(decoded.port).toBe(4000)
    })

    it('handles lowercase input', () => {
      const code = encodeSessionCode('192.168.1.1', 4000)
      const decoded = decodeSessionCode(code.toLowerCase())
      expect(decoded.port).toBe(4000)
    })

    it('handles code without prefix', () => {
      const code = encodeSessionCode('192.168.1.1', 4000)
      const raw = code.replace('VIBE-', '')
      const decoded = decodeSessionCode(raw)
      expect(decoded.port).toBe(4000)
    })

    it('throws for invalid format', () => {
      expect(() => decodeSessionCode('INVALID!')).toThrow(InvalidSessionCodeError)
    })
  })
})
