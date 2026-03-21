const { Router } = require('express')
const { createUser, findByEmail, verifyPassword, sanitizeUser } = require('../models/user')
const { createToken } = require('../utils/jwt')

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await createUser(email, password, username)
    const token = createToken(user)

    res.status(201).json({ user, token })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await findByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const validPassword = await verifyPassword(user, password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = createToken(sanitizeUser(user))
    res.json({ user: sanitizeUser(user), token })
  } catch (err) {
    next(err)
  }
})

module.exports = { authRouter: router }
