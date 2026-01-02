/**
 * Test setup and utilities
 * Provides test database and helper functions
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use a unique test database path to avoid conflicts
const TEST_DB_PATH = path.join(__dirname, '../data/test-townhall-' + Date.now() + '.db');
const SCHEMA_PATH = path.join(__dirname, '../src/db/schema.sql');

let testDb = null;

/**
 * Initialize a test database
 */
async function initTestDatabase() {
  return new Promise((resolve, reject) => {
    // Ensure data directory exists
    const dataDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Remove existing test database if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch (err) {
        // Ignore errors if file doesn't exist or is locked
      }
    }

    // Create new database with write permissions
    const db = new sqlite3.Database(TEST_DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    // Read and execute schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Add creator_id column if needed
      db.run('ALTER TABLE campaigns ADD COLUMN creator_id TEXT', (alterErr) => {
        // Ignore error if column already exists
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          // Just a warning, not critical
        }
        testDb = db;
        resolve(db);
      });
    });
  });
}

/**
 * Get test database instance
 */
function getTestDatabase() {
  if (!testDb) {
    throw new Error('Test database not initialized. Call initTestDatabase() first.');
  }
  return testDb;
}

/**
 * Close test database
 */
function closeTestDatabase() {
  return new Promise((resolve, reject) => {
    if (testDb) {
      testDb.close((err) => {
        if (err) {
          reject(err);
        } else {
          testDb = null;
          // No need to clean up in-memory database
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

/**
 * Helper to run queries on test database
 */
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = getTestDatabase();
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Helper to get single row from test database
 */
function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = getTestDatabase();
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Helper to get multiple rows from test database
 */
function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = getTestDatabase();
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Clear all data from test database
 */
async function clearTestDatabase() {
  await runQuery('DELETE FROM votes');
  await runQuery('DELETE FROM questions');
  await runQuery('DELETE FROM campaigns');
}

module.exports = {
  initTestDatabase,
  getTestDatabase,
  closeTestDatabase,
  runQuery,
  getQuery,
  allQuery,
  clearTestDatabase,
  TEST_DB_PATH
};
