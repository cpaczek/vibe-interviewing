# Solution: Wishlist Feature — Medusa Plugin

## Overview

The candidate needs to implement four REST endpoints in `src/routes/wishlist.js`
that manage a product wishlist backed by SQLite.

## Expected Implementation (src/routes/wishlist.js)

```javascript
const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { db } = require('../database')

const wishlistRouter = express.Router()

// POST /api/wishlist — Add a product to the wishlist
wishlistRouter.post('/', (req, res) => {
  const { productId } = req.body

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' })
  }

  // Check that the product exists
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId)
  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }

  // Check for duplicates
  const existing = db.prepare('SELECT * FROM wishlists WHERE product_id = ?').get(productId)
  if (existing) {
    return res.status(409).json({ error: 'Product already in wishlist' })
  }

  const id = uuidv4()
  const createdAt = new Date().toISOString()
  db.prepare('INSERT INTO wishlists (id, product_id, created_at) VALUES (?, ?, ?)').run(
    id,
    productId,
    createdAt,
  )

  res.status(201).json({ id, productId, createdAt })
})

// GET /api/wishlist — List all wishlist items
wishlistRouter.get('/', (req, res) => {
  const items = db
    .prepare(
      `
    SELECT w.id, w.product_id AS productId, w.created_at AS createdAt,
           p.name, p.price, p.description
    FROM wishlists w
    JOIN products p ON w.product_id = p.id
    ORDER BY w.created_at DESC
  `,
    )
    .all()

  res.json(items)
})

// DELETE /api/wishlist/:productId — Remove a product from the wishlist
wishlistRouter.delete('/:productId', (req, res) => {
  const { productId } = req.params

  const existing = db.prepare('SELECT * FROM wishlists WHERE product_id = ?').get(productId)
  if (!existing) {
    return res.status(404).json({ error: 'Product not in wishlist' })
  }

  db.prepare('DELETE FROM wishlists WHERE product_id = ?').run(productId)
  res.status(204).send()
})

// GET /api/wishlist/:productId/check — Check if product is in wishlist
wishlistRouter.get('/:productId/check', (req, res) => {
  const { productId } = req.params

  const item = db.prepare('SELECT * FROM wishlists WHERE product_id = ?').get(productId)
  res.json({ inWishlist: !!item })
})

module.exports = { wishlistRouter }
```

## Key Points

1. **Validation**: Check that `productId` exists in the request body for POST
2. **404 for missing products**: Verify the product exists before adding to wishlist
3. **409 for duplicates**: Check the wishlists table before inserting
4. **JOIN query**: The GET /api/wishlist endpoint should join with the products table
   to return product details alongside wishlist metadata
5. **204 No Content**: DELETE returns 204 on success with no body
6. **Boolean check**: The /check endpoint returns `{ inWishlist: true/false }`

## Database Schema (already provided)

```sql
CREATE TABLE wishlists (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
)
```
