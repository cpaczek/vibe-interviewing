const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { app } = require('../index')
const { db } = require('../database')

/**
 * Simple helper to make HTTP requests to the test server.
 */
function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://localhost:${server.address().port}`)
    const headers = {}
    let payload

    if (body) {
      payload = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(payload)
    }

    const req = http.request(url, { method, headers }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

describe('Wishlist API', () => {
  let server
  let testProductId

  before(() => {
    return new Promise((resolve) => {
      server = app.listen(0, resolve)
    })
  })

  after(() => {
    return new Promise((resolve) => {
      server.close(resolve)
    })
  })

  beforeEach(() => {
    // Clear the wishlists table before each test
    db.prepare('DELETE FROM wishlists').run()

    // Grab a valid product ID for testing
    const product = db.prepare('SELECT id FROM products LIMIT 1').get()
    testProductId = product.id
  })

  it('POST /api/wishlist adds a product to the wishlist', async () => {
    const res = await request(server, 'POST', '/api/wishlist', {
      productId: testProductId,
    })

    assert.equal(res.status, 201)
    assert.ok(res.body.id, 'Response should include a wishlist item ID')
    assert.equal(res.body.productId, testProductId)
    assert.ok(res.body.createdAt, 'Response should include createdAt timestamp')
  })

  it('POST /api/wishlist returns 409 when adding a duplicate product', async () => {
    // Add the product once
    await request(server, 'POST', '/api/wishlist', {
      productId: testProductId,
    })

    // Try to add it again
    const res = await request(server, 'POST', '/api/wishlist', {
      productId: testProductId,
    })

    assert.equal(res.status, 409)
    assert.ok(res.body.error, 'Response should include an error message')
  })

  it('POST /api/wishlist returns 404 for a non-existent product', async () => {
    const res = await request(server, 'POST', '/api/wishlist', {
      productId: 'non-existent-product-id',
    })

    assert.equal(res.status, 404)
    assert.ok(res.body.error, 'Response should include an error message')
  })

  it('GET /api/wishlist returns all wishlist items with product details', async () => {
    // Add a product to the wishlist first
    await request(server, 'POST', '/api/wishlist', {
      productId: testProductId,
    })

    const res = await request(server, 'GET', '/api/wishlist')

    assert.equal(res.status, 200)
    assert.equal(Array.isArray(res.body), true)
    assert.equal(res.body.length, 1)

    const item = res.body[0]
    assert.equal(item.productId, testProductId)
    assert.ok(item.name, 'Wishlist item should include product name')
    assert.ok(item.price !== undefined, 'Wishlist item should include product price')
  })

  it('GET /api/wishlist returns empty array when wishlist is empty', async () => {
    const res = await request(server, 'GET', '/api/wishlist')

    assert.equal(res.status, 200)
    assert.equal(Array.isArray(res.body), true)
    assert.equal(res.body.length, 0)
  })

  it('DELETE /api/wishlist/:productId removes a product from the wishlist', async () => {
    // Add a product first
    await request(server, 'POST', '/api/wishlist', {
      productId: testProductId,
    })

    // Delete it
    const res = await request(server, 'DELETE', `/api/wishlist/${testProductId}`)
    assert.equal(res.status, 204)

    // Verify it's gone
    const listRes = await request(server, 'GET', '/api/wishlist')
    assert.equal(listRes.body.length, 0)
  })

  it('DELETE /api/wishlist/:productId returns 404 if product is not in wishlist', async () => {
    const res = await request(server, 'DELETE', `/api/wishlist/${testProductId}`)
    assert.equal(res.status, 404)
    assert.ok(res.body.error, 'Response should include an error message')
  })

  it('GET /api/wishlist/:productId/check returns true when product is in wishlist', async () => {
    // Add the product
    await request(server, 'POST', '/api/wishlist', {
      productId: testProductId,
    })

    const res = await request(server, 'GET', `/api/wishlist/${testProductId}/check`)
    assert.equal(res.status, 200)
    assert.equal(res.body.inWishlist, true)
  })

  it('GET /api/wishlist/:productId/check returns false when product is not in wishlist', async () => {
    const res = await request(server, 'GET', `/api/wishlist/${testProductId}/check`)
    assert.equal(res.status, 200)
    assert.equal(res.body.inWishlist, false)
  })
})
