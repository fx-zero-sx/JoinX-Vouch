const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

// Ensure the database directory exists before opening the file.
const dbDir = __dirname;
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'vouch.sqlite'));
db.pragma('journal_mode = WAL');

// ---- Schema ----
db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    product TEXT NOT NULL,
    rating INTEGER NOT NULL,
    review TEXT NOT NULL,
    imageUrl TEXT,
    helpfulCount INTEGER NOT NULL DEFAULT 0,
    favoriteCount INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL,
    messageId TEXT,
    channelId TEXT
  );

  CREATE TABLE IF NOT EXISTS votes (
    reviewId INTEGER NOT NULL,
    userId TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('helpful', 'favorite')),
    PRIMARY KEY (reviewId, userId, type)
  );

  CREATE TABLE IF NOT EXISTS cooldowns (
    userId TEXT PRIMARY KEY,
    lastVouch INTEGER NOT NULL
  );
`);

// ---- Prepared statements (compiled once, reused everywhere = fast) ----
const statements = {
  insertReview: db.prepare(`
    INSERT INTO reviews (userId, username, product, rating, review, imageUrl, helpfulCount, favoriteCount, timestamp)
    VALUES (@userId, @username, @product, @rating, @review, @imageUrl, 0, 0, @timestamp)
  `),
  setReviewMessage: db.prepare(`
    UPDATE reviews SET messageId = ?, channelId = ? WHERE id = ?
  `),
  getReviewById: db.prepare(`SELECT * FROM reviews WHERE id = ?`),
  deleteReviewById: db.prepare(`DELETE FROM reviews WHERE id = ?`),
  deleteVotesForReview: db.prepare(`DELETE FROM votes WHERE reviewId = ?`),
  countReviews: db.prepare(`SELECT COUNT(*) AS count FROM reviews`),
  getReviewsPage: db.prepare(`
    SELECT * FROM reviews ORDER BY id DESC LIMIT ? OFFSET ?
  `),
  getVote: db.prepare(`SELECT 1 FROM votes WHERE reviewId = ? AND userId = ? AND type = ?`),
  addVote: db.prepare(`INSERT INTO votes (reviewId, userId, type) VALUES (?, ?, ?)`),
  incrementHelpful: db.prepare(`UPDATE reviews SET helpfulCount = helpfulCount + 1 WHERE id = ?`),
  incrementFavorite: db.prepare(`UPDATE reviews SET favoriteCount = favoriteCount + 1 WHERE id = ?`),
  getCooldown: db.prepare(`SELECT lastVouch FROM cooldowns WHERE userId = ?`),
  setCooldown: db.prepare(`
    INSERT INTO cooldowns (userId, lastVouch) VALUES (?, ?)
    ON CONFLICT(userId) DO UPDATE SET lastVouch = excluded.lastVouch
  `)
};

module.exports = {
  db,

  createReview(data) {
    const result = statements.insertReview.run(data);
    return statements.getReviewById.get(result.lastInsertRowid);
  },

  attachMessageInfo(reviewId, messageId, channelId) {
    statements.setReviewMessage.run(messageId, channelId, reviewId);
  },

  getReview(id) {
    return statements.getReviewById.get(id);
  },

  deleteReview(id) {
    statements.deleteVotesForReview.run(id);
    const result = statements.deleteReviewById.run(id);
    return result.changes > 0;
  },

  getReviewCount() {
    return statements.countReviews.get().count;
  },

  getReviewsPage(page, perPage) {
    const offset = (page - 1) * perPage;
    return statements.getReviewsPage.all(perPage, offset);
  },

  hasVoted(reviewId, userId, type) {
    return Boolean(statements.getVote.get(reviewId, userId, type));
  },

  /**
   * Registers a vote and increments the appropriate counter.
   * Returns false if the user already voted (no-op), true if the vote was recorded.
   */
  addVote(reviewId, userId, type) {
    if (this.hasVoted(reviewId, userId, type)) return false;
    const addVoteAndIncrement = db.transaction(() => {
      statements.addVote.run(reviewId, userId, type);
      if (type === 'helpful') statements.incrementHelpful.run(reviewId);
      else statements.incrementFavorite.run(reviewId);
    });
    addVoteAndIncrement();
    return true;
  },

  getCooldownRemaining(userId, cooldownMs) {
    const row = statements.getCooldown.get(userId);
    if (!row) return 0;
    const elapsed = Date.now() - row.lastVouch;
    return Math.max(0, cooldownMs - elapsed);
  },

  setCooldown(userId) {
    statements.setCooldown.run(userId, Date.now());
  }
};
