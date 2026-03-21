const Database = require('better-sqlite3')
const { v4: uuidv4 } = require('uuid')

const db = new Database(':memory:')

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Create tables
db.exec(`
  CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE wishlists (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`)

// Seed products
const insertProduct = db.prepare(`
  INSERT INTO products (id, name, description, price, category, image_url, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const seedProducts = [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium over-ear headphones with active noise cancellation and 30-hour battery life.',
    price: 89.99,
    category: 'electronics',
    image_url: 'https://example.com/images/headphones.jpg',
  },
  {
    name: 'Organic Cotton T-Shirt',
    description: 'Soft, breathable crew-neck t-shirt made from 100% organic cotton.',
    price: 24.99,
    category: 'clothing',
    image_url: 'https://example.com/images/tshirt.jpg',
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: 'Double-walled insulated bottle that keeps drinks cold for 24 hours.',
    price: 34.99,
    category: 'accessories',
    image_url: 'https://example.com/images/bottle.jpg',
  },
  {
    name: 'Mechanical Keyboard',
    description: 'Compact 75% layout with hot-swappable switches and RGB backlighting.',
    price: 129.99,
    category: 'electronics',
    image_url: 'https://example.com/images/keyboard.jpg',
  },
  {
    name: 'Running Shoes',
    description: 'Lightweight trainers with responsive cushioning for daily runs.',
    price: 119.99,
    category: 'footwear',
    image_url: 'https://example.com/images/shoes.jpg',
  },
  {
    name: 'Leather Wallet',
    description: 'Slim bifold wallet with RFID blocking, holds 8 cards and cash.',
    price: 49.99,
    category: 'accessories',
    image_url: 'https://example.com/images/wallet.jpg',
  },
  {
    name: 'Ceramic Pour-Over Coffee Maker',
    description: 'Handcrafted dripper for a clean, bright cup of coffee every morning.',
    price: 38.00,
    category: 'kitchen',
    image_url: 'https://example.com/images/coffeemaker.jpg',
  },
  {
    name: 'Yoga Mat',
    description: 'Extra-thick 6mm mat with non-slip surface and carrying strap.',
    price: 29.99,
    category: 'fitness',
    image_url: 'https://example.com/images/yogamat.jpg',
  },
  {
    name: 'Portable Charger 20000mAh',
    description: 'Fast-charging power bank with USB-C and dual USB-A ports.',
    price: 44.99,
    category: 'electronics',
    image_url: 'https://example.com/images/charger.jpg',
  },
  {
    name: 'Cast Iron Skillet 12-inch',
    description: 'Pre-seasoned cast iron pan, oven-safe to 500°F, built to last a lifetime.',
    price: 39.99,
    category: 'kitchen',
    image_url: 'https://example.com/images/skillet.jpg',
  },
]

const now = new Date().toISOString()
for (const product of seedProducts) {
  insertProduct.run(
    uuidv4(),
    product.name,
    product.description,
    product.price,
    product.category,
    product.image_url,
    now
  )
}

module.exports = { db }
