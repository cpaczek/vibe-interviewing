// TODO: Implement wishlist routes
//
// Endpoints to implement:
//   POST   /api/wishlist              — Add a product to the wishlist
//   GET    /api/wishlist              — List all wishlist items
//   DELETE /api/wishlist/:productId   — Remove a product from the wishlist
//   GET    /api/wishlist/:productId/check — Check if a product is in the wishlist
//
// See src/routes/products.js for examples of how routes are structured.
// The wishlists table is already created in src/database.js.

const express = require('express')

const wishlistRouter = express.Router()

// Your implementation goes here

module.exports = { wishlistRouter }
