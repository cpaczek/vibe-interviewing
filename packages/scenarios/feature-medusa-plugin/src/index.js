const express = require('express')
const { productsRouter } = require('./routes/products')
const { wishlistRouter } = require('./routes/wishlist')

const app = express()
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/products', productsRouter)
app.use('/api/wishlist', wishlistRouter)

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message)
  res.status(err.status || 500).json({ error: err.message })
})

const PORT = process.env.PORT || 3000

// Only start the server when run directly (not during tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Wishlist API running on port ${PORT}`)
  })
}

module.exports = { app }
