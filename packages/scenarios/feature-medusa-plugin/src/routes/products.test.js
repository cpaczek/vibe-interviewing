const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { app } = require('../index')

/**
 * Simple helper to make HTTP requests to the test server.
 */
function request(server, method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://localhost:${server.address().port}`)
    const req = http.request(url, { method }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) })
        } catch {
          resolve({ status: res.statusCode, body })
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

describe('Products API', () => {
  let server

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

  it('GET /api/health returns ok', async () => {
    const res = await request(server, 'GET', '/api/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'ok')
  })

  it('GET /api/products returns all 10 products', async () => {
    const res = await request(server, 'GET', '/api/products')
    assert.equal(res.status, 200)
    assert.equal(Array.isArray(res.body), true)
    assert.equal(res.body.length, 10)
  })

  it('GET /api/products?category=electronics returns filtered results', async () => {
    const res = await request(server, 'GET', '/api/products?category=electronics')
    assert.equal(res.status, 200)
    assert.equal(Array.isArray(res.body), true)
    assert.equal(res.body.length, 3)
    for (const product of res.body) {
      assert.equal(product.category, 'electronics')
    }
  })

  it('GET /api/products/:id returns a single product', async () => {
    // First get all products to grab a valid ID
    const allRes = await request(server, 'GET', '/api/products')
    const productId = allRes.body[0].id

    const res = await request(server, 'GET', `/api/products/${productId}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.id, productId)
    assert.ok(res.body.name)
    assert.ok(res.body.price)
  })

  it('GET /api/products/:id returns 404 for non-existent product', async () => {
    const res = await request(server, 'GET', '/api/products/non-existent-id')
    assert.equal(res.status, 404)
    assert.equal(res.body.error, 'Product not found')
  })
})
