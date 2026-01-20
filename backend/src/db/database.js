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
      
      // Add pin column to existing campaigns table if it doesn't exist
      db.run('ALTER TABLE campaigns ADD COLUMN pin TEXT', (alterErr) => {
        // Ignore error if column already exists
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.warn('Note: pin column may already exist:', alterErr.message);
        }
      });
      
      // Add fingerprint_hash column to existing votes table if it doesn't exist
      db.run('ALTER TABLE votes ADD COLUMN fingerprint_hash TEXT', (alterErr) => {
        // Ignore error if column already exists
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.warn('Note: fingerprint_hash column may already exist:', alterErr.message);
        } else {
          // If column was just added, set a default value for existing rows
          if (!alterErr) {
            db.run('UPDATE votes SET fingerprint_hash = user_id WHERE fingerprint_hash IS NULL', (updateErr) => {
              if (updateErr) {
                console.warn('Note: Could not set default fingerprint_hash:', updateErr.message);
              }
            });
          }
        }
      });
      
      // Create unique index on fingerprint_hash if it doesn't exist
      db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_question_fingerprint ON votes(question_id, fingerprint_hash)', (indexErr) => {
        if (indexErr && !indexErr.message.includes('already exists')) {
          console.warn('Note: Could not create fingerprint index:', indexErr.message);
        }
      });
      
      // Add status column to existing feedback table if it doesn't exist
      db.run('ALTER TABLE feedback ADD COLUMN status TEXT DEFAULT \'open\'', (alterErr) => {
        // Ignore error if column already exists
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.warn('Note: status column may already exist:', alterErr.message);
        } else {
          // If column was just added, set default value for existing rows
          if (!alterErr) {
            db.run('UPDATE feedback SET status = \'open\' WHERE status IS NULL', (updateErr) => {
              if (updateErr) {
                console.warn('Note: Could not set default status:', updateErr.message);
              }
            });
          }
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

// Helper function to convert SQLite datetime string to ISO 8601 format (UTC)
// SQLite CURRENT_TIMESTAMP returns UTC time but without timezone info
// This ensures JavaScript interprets it as UTC
function formatDatetime(datetime) {
  if (!datetime) return null;
  // If already in ISO format or has timezone info, return as-is
  if (typeof datetime === 'string' && (datetime.includes('T') || datetime.includes('Z') || datetime.includes('+'))) {
    return datetime;
  }
  // SQLite format: "YYYY-MM-DD HH:MM:SS" - treat as UTC
  // Convert to ISO 8601 format with Z (UTC)
  // Replace space with T and append Z to indicate UTC
  const dtString = datetime.toString().trim();
  if (dtString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    // SQLite datetime format - treat as UTC
    return dtString.replace(' ', 'T') + 'Z';
  }
  // If format doesn't match, try to parse it
  return new Date(dtString).toISOString();
}

module.exports = {
  getDatabase,
  runQuery,
  getQuery,
  allQuery,
  formatDatetime
};

