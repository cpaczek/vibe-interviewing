const { describe, it } = require('node:test')
const assert = require('node:assert')
const { createToken, verifyToken } = require('./jwt')

describe('JWT Utils', () => {
  const testUser = { id: 1, email: 'test@example.com' }

  it('should create a valid token', () => {
    const token = createToken(testUser)
    assert.ok(token)
    assert.strictEqual(typeof token, 'string')
    assert.ok(token.split('.').length === 3, 'Token should have 3 parts')
  })

  it('should verify a token created just now', () => {
    const token = createToken(testUser)
    const decoded = verifyToken(token)
    assert.ok(decoded, 'Token should verify successfully')
    assert.strictEqual(decoded.email, testUser.email)
    assert.strictEqual(decoded.id, testUser.id)
  })

  it('should verify a token created yesterday', () => {
    // Simulate a token that was created yesterday by manually
    // setting the iat (issued-at) to 24 hours ago
    const jwt = require('jsonwebtoken')
    const SECRET = require('./jwt').SECRET

    const yesterday = Math.floor(Date.now() / 1000) - 86400
    const token = jwt.sign(
      { id: testUser.id, email: testUser.email, iat: yesterday },
      SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    )

    const decoded = verifyToken(token)
    assert.ok(decoded, 'Token from yesterday should still verify')
    assert.strictEqual(decoded.email, testUser.email)
  })

  it('should reject an expired token', () => {
    const jwt = require('jsonwebtoken')
    const SECRET = require('./jwt').SECRET

    const token = jwt.sign(
      { id: testUser.id, email: testUser.email },
      SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' }
    )

    const decoded = verifyToken(token)
    assert.strictEqual(decoded, null, 'Expired token should not verify')
  })

  it('should reject a token with invalid signature', () => {
    const jwt = require('jsonwebtoken')
    const token = jwt.sign(
      { id: testUser.id, email: testUser.email },
      'wrong-secret',
      { algorithm: 'HS256' }
    )

    const decoded = verifyToken(token)
    assert.strictEqual(decoded, null, 'Token with wrong secret should not verify')
  })
})
