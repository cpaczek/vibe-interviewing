const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const { findById, sanitizeUser } = require('../models/user')

const router = Router()

// GET /api/users/me — get current user profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await findById(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user: sanitizeUser(user) })
  } catch (err) {
    next(err)
  }
})

module.exports = { usersRouter: router }
