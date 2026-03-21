const bcrypt = require('bcryptjs')

// In-memory user store (simulates a database)
const users = []
let nextId = 1

async function createUser(email, password, username) {
  const existingUser = users.find(u => u.email === email)
  if (existingUser) {
    throw Object.assign(new Error('Email already in use'), { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = {
    id: nextId++,
    email,
    username: username || email.split('@')[0],
    password: hashedPassword,
    bio: '',
    image: null,
    createdAt: new Date().toISOString(),
  }

  users.push(user)
  return sanitizeUser(user)
}

async function findByEmail(email) {
  return users.find(u => u.email === email) || null
}

async function findById(id) {
  return users.find(u => u.id === id) || null
}

async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password)
}

function sanitizeUser(user) {
  const { password, ...safe } = user
  return safe
}

module.exports = { createUser, findByEmail, findById, verifyPassword, sanitizeUser }
