# Evaluation: Wishlist Feature — Medusa Plugin

## Criteria

### Process & Approach (40%)

- Did they read the existing code (products routes, database schema) before jumping in?
- Did they run `npm test` early to understand what the failing tests expect?
- Did they implement and test incrementally, or try to build everything at once?
- Did they check the database schema to understand the wishlists table structure?

### Implementation Quality (35%)

- Are all four endpoints correctly implemented?
- Do they handle edge cases properly (409 for duplicates, 404 for missing products)?
- Is the code consistent with the existing patterns in products.js?
- Did they use appropriate HTTP status codes (201 for created, 204 for delete, etc.)?
- Does the GET /api/wishlist endpoint join with products to return useful data?

### AI Collaboration (25%)

- How effectively did they prompt the AI for guidance?
- Did they ask the AI to explain concepts vs. write code for them?
- Did they verify AI suggestions by running tests?
- Did they iterate on AI feedback or blindly accept first suggestions?

## Expected Solution

Implement `src/routes/wishlist.js` with an Express Router containing four endpoints:

1. `POST /api/wishlist` — validates productId, checks product exists, checks for duplicates, inserts
2. `GET /api/wishlist` — joins wishlists with products table, returns enriched list
3. `DELETE /api/wishlist/:productId` — checks item exists in wishlist, removes it
4. `GET /api/wishlist/:productId/check` — returns boolean indicating wishlist membership

All 8+ tests in `src/routes/wishlist.test.js` should pass.

## Scoring Guide

- **Strong (8-10)**: Read existing code first, ran tests early, implemented incrementally,
  handled all edge cases, used AI for guidance not generation, clean code
- **Adequate (5-7)**: Got tests passing with some help, handled most edge cases,
  reasonable AI usage, may have needed hints
- **Weak (1-4)**: Asked AI to write everything, didn't read existing code, missed edge cases,
  didn't run tests until the end, inconsistent code style
