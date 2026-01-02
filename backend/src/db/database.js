const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/townhall.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    // Read and execute schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema, (err) => {
      if (err) {
        console.error('Error executing schema:', err);
        reject(err);
        return;
      }
      console.log('Database schema initialized');
      
      // Add creator_id column to existing campaigns table if it doesn't exist
      db.run('ALTER TABLE campaigns ADD COLUMN creator_id TEXT', (alterErr) => {
        // Ignore error if column already exists
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.warn('Note: creator_id column may already exist:', alterErr.message);
        }
      });
      
      // Add user_id and updated_at columns to existing questions table if they don't exist
      db.run('ALTER TABLE questions ADD COLUMN user_id TEXT', (alterErr) => {
        // Ignore error if column already exists
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.warn('Note: user_id column may already exist:', alterErr.message);
        }
      });
      
      db.run('ALTER TABLE questions ADD COLUMN updated_at DATETIME', (alterErr) => {
        // Ignore error if column already exists
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.warn('Note: updated_at column may already exist:', alterErr.message);
        }
      });
      
      resolve(db);
    });
  });
}

// Get database instance
let dbInstance = null;

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await initDatabase();
  }
  return dbInstance;
}

// Helper function to run queries
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().then(db => {
      db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    }).catch(reject);
  });
}

// Helper function to get single row
function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().then(db => {
      db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    }).catch(reject);
  });
}

// Helper function to get multiple rows
function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().then(db => {
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    }).catch(reject);
  });
}

module.exports = {
  getDatabase,
  runQuery,
  getQuery,
  allQuery
};

