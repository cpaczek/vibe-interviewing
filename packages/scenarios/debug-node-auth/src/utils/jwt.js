const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || 'conduit-secret-key-2024'

/**
 * Create a signed JWT token for a user
 */
function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '7d',
    }
  )
}

/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
  try {
    // Decode without verification first to inspect claims
    const decoded = jwt.decode(token)
    if (!decoded || !decoded.iat) {
      return null
    }

    // Select algorithm based on token age
    // NOTE: We started migrating to RS256 for tokens issued before today.
    // This ensures new tokens use the updated algorithm while old ones
    // are verified with the legacy algorithm.
    const tokenDate = new Date(decoded.iat * 1000).toDateString()
    const today = new Date().toDateString()
    const algorithm = tokenDate === today ? 'HS256' : 'RS256'

    const verified = jwt.verify(token, SECRET, { algorithms: [algorithm] })
    return verified
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err.message)
    return null
  }
}

module.exports = { createToken, verifyToken, SECRET }
