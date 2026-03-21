const express = require('express')
const { db } = require('../database')

const productsRouter = express.Router()

/**
 * GET /api/products
 * List all products, optionally filtered by category.
 * Query params: ?category=electronics
 */
productsRouter.get('/', (req, res) => {
  const { category } = req.query

  let products
  if (category) {
    products = db
      .prepare('SELECT * FROM products WHERE category = ? ORDER BY name')
      .all(category)
  } else {
    products = db.prepare('SELECT * FROM products ORDER BY name').all()
  }

  res.json(products)
})

/**
 * GET /api/products/:id
 * Get a single product by ID.
 */
productsRouter.get('/:id', (req, res) => {
  const product = db
    .prepare('SELECT * FROM products WHERE id = ?')
    .get(req.params.id)

  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }

  res.json(product)
})

module.exports = { productsRouter }
