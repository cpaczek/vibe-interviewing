const express = require('express')
const { authRouter } = require('./routes/auth')
const { usersRouter } = require('./routes/users')
const { articlesRouter } = require('./routes/articles')

const app = express()
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/articles', articlesRouter)

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message)
  res.status(err.status || 500).json({ error: err.message })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Conduit API running on port ${PORT}`)
})

module.exports = { app }
