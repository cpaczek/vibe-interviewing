const { Router } = require('express')
const { authenticate, optionalAuth } = require('../middleware/auth')

const router = Router()

// In-memory article store
const articles = [
  {
    id: 1,
    title: 'Welcome to Conduit',
    body: 'This is a sample article to get you started.',
    authorId: 0,
    createdAt: new Date().toISOString(),
  },
]
let nextId = 2

// GET /api/articles — list articles
router.get('/', optionalAuth, (req, res) => {
  res.json({
    articles: articles.map(a => ({
      ...a,
      favorited: false,
      favoritesCount: 0,
    })),
    articlesCount: articles.length,
  })
})

// POST /api/articles — create article (requires auth)
router.post('/', authenticate, (req, res) => {
  const { title, body, description } = req.body

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' })
  }

  const article = {
    id: nextId++,
    title,
    body,
    description: description || '',
    authorId: req.user.id,
    createdAt: new Date().toISOString(),
  }

  articles.push(article)
  res.status(201).json({ article })
})

// GET /api/articles/:id
router.get('/:id', optionalAuth, (req, res) => {
  const article = articles.find(a => a.id === parseInt(req.params.id))
  if (!article) {
    return res.status(404).json({ error: 'Article not found' })
  }
  res.json({ article })
})

module.exports = { articlesRouter: router }
