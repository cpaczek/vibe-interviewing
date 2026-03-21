const { verifyToken } = require('../utils/jwt')

/**
 * Authentication middleware — verifies JWT token from Authorization header
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' })
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' })
  }

  const token = parts[1]
  const decoded = verifyToken(token)

  if (!decoded) {
    console.error('[AUTH] Failed to authenticate request to', req.path)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = decoded
  next()
}

/**
 * Optional authentication — attaches user if token is present, but doesn't require it
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return next()
  }

  const parts = authHeader.split(' ')
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const decoded = verifyToken(parts[1])
    if (decoded) {
      req.user = decoded
    }
  }

  next()
}

module.exports = { authenticate, optionalAuth }
