const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../../data/townhall.db');
const BACKUP_DIR = path.join(__dirname, '../../data/backups');
const METADATA_FILE = path.join(BACKUP_DIR, '.last_backup_checksum');
const RETENTION_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// Track if backup is currently running
let isBackupRunning = false;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Computes SHA256 checksum of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Hexadecimal checksum string
 */
function computeFileChecksum(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File does not exist: ${filePath}`));
      return;
    }

    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => {
      hash.update(data);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Reads the last backup metadata (checksum and timestamp)
 * @returns {Promise<{checksum: string, timestamp: number} | null>}
 */
function getLastBackupMetadata() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(METADATA_FILE)) {
      resolve(null);
      return;
    }

    fs.readFile(METADATA_FILE, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const metadata = JSON.parse(data);
        resolve(metadata);
      } catch (parseErr) {
        // If JSON parse fails, treat as no previous backup
        resolve(null);
      }
    });
  });
}

/**
 * Writes the backup metadata (checksum and timestamp)
 * @param {string} checksum - SHA256 checksum
 * @param {number} timestamp - Unix timestamp in milliseconds
 */
function saveBackupMetadata(checksum, timestamp) {
  return new Promise((resolve, reject) => {
    const metadata = {
      checksum,
      timestamp
    };

    fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Checks if a backup should be created
 * @param {string} currentChecksum - Current database checksum
 * @param {{checksum: string, timestamp: number} | null} lastMetadata - Last backup metadata
 * @returns {boolean} - True if backup should be created
 */
function shouldCreateBackup(currentChecksum, lastMetadata) {
  // Always backup if no previous backup exists
  if (!lastMetadata) {
    return true;
  }

  // Backup if database has changed
  if (lastMetadata.checksum !== currentChecksum) {
    return true;
  }

  // Backup if last backup is older than retention period (ensure at least one backup within 30 days)
  const now = Date.now();
  const lastBackupAge = now - lastMetadata.timestamp;
  const retentionMs = RETENTION_DAYS * MILLISECONDS_PER_DAY;

  if (lastBackupAge > retentionMs) {
    return true;
  }

  return false;
}

/**
 * Creates a timestamped backup file
 * @returns {Promise<string>} - Path to the created backup file
 */
function createBackupFile() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(DB_PATH)) {
      reject(new Error(`Database file does not exist: ${DB_PATH}`));
      return;
    }

    const timestamp = new Date();
    const dateStr = timestamp.toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '');
    const backupFileName = `townhall-${dateStr}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    // Copy the database file
    const readStream = fs.createReadStream(DB_PATH);
    const writeStream = fs.createWriteStream(backupPath);

    readStream.on('error', (err) => {
      reject(err);
    });

    writeStream.on('error', (err) => {
      reject(err);
    });

    writeStream.on('finish', () => {
      resolve(backupPath);
    });

    readStream.pipe(writeStream);
  });
}

/**
 * Cleans up backup files older than the retention period
 * @returns {Promise<number>} - Number of files deleted
 */
function cleanupOldBackups() {
  return new Promise((resolve, reject) => {
    fs.readdir(BACKUP_DIR, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const now = Date.now();
      const retentionMs = RETENTION_DAYS * MILLISECONDS_PER_DAY;
      let deletedCount = 0;

      // Filter to only backup files (exclude metadata file)
      const backupFiles = files.filter(file => 
        file.startsWith('townhall-') && file.endsWith('.db')
      );

      const deletePromises = backupFiles.map((file) => {
        return new Promise((resolveDelete) => {
          const filePath = path.join(BACKUP_DIR, file);
          
          fs.stat(filePath, (statErr, stats) => {
            if (statErr) {
              resolveDelete();
              return;
            }

            const fileAge = now - stats.mtimeMs;

            if (fileAge > retentionMs) {
              fs.unlink(filePath, (unlinkErr) => {
                if (!unlinkErr) {
                  deletedCount++;
                }
                resolveDelete();
              });
            } else {
              resolveDelete();
            }
          });
        });
      });

      Promise.all(deletePromises).then(() => {
        resolve(deletedCount);
      }).catch(reject);
    });
  });
}

/**
 * Gets the current backup status
 * @returns {Promise<{running: boolean, lastBackup: number | null}>}
 */
async function getBackupStatus() {
  let lastBackup = null;
  try {
    const metadata = await getLastBackupMetadata();
    if (metadata) {
      lastBackup = metadata.timestamp;
    }
  } catch (error) {
    // If we can't read metadata, just return null for lastBackup
    console.error('[Backup] Error reading backup metadata:', error.message);
  }
  
  return {
    running: isBackupRunning,
    lastBackup
  };
}

/**
 * Main backup function that orchestrates the backup process
 * @returns {Promise<void>}
 */
async function performBackup() {
  // Set running flag at the start
  isBackupRunning = true;
  
  try {
    console.log('[Backup] Starting backup check...');

    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
      console.log('[Backup] Database file does not exist, skipping backup');
      return;
    }

    // Compute current database checksum
    const currentChecksum = await computeFileChecksum(DB_PATH);
    console.log(`[Backup] Current database checksum: ${currentChecksum.substring(0, 8)}...`);

    // Get last backup metadata
    const lastMetadata = await getLastBackupMetadata();

    // Check if backup is needed
    if (!shouldCreateBackup(currentChecksum, lastMetadata)) {
      console.log('[Backup] No changes detected and backup exists within retention period, skipping');
      return;
    }

    // Determine backup reason
    let backupReason = 'First backup';
    if (lastMetadata) {
      if (lastMetadata.checksum !== currentChecksum) {
        backupReason = 'Database changed';
      } else {
        const daysSinceLastBackup = Math.floor((Date.now() - lastMetadata.timestamp) / MILLISECONDS_PER_DAY);
        backupReason = `No backup in ${daysSinceLastBackup} days (ensuring minimum backup within ${RETENTION_DAYS} days)`;
      }
    }

    console.log(`[Backup] Creating backup (reason: ${backupReason})...`);

    // Create backup file
    const backupPath = await createBackupFile();
    const backupFileName = path.basename(backupPath);
    console.log(`[Backup] Backup created: ${backupFileName}`);

    // Save metadata
    const timestamp = Date.now();
    await saveBackupMetadata(currentChecksum, timestamp);
    console.log('[Backup] Backup metadata saved');

    // Cleanup old backups
    const deletedCount = await cleanupOldBackups();
    if (deletedCount > 0) {
      console.log(`[Backup] Cleaned up ${deletedCount} old backup(s)`);
    }

    console.log('[Backup] Backup process completed successfully');
  } catch (error) {
    console.error('[Backup] Error during backup process:', error.message);
    // Don't throw - we don't want backup failures to crash the server
  } finally {
    // Always clear the running flag when done
    isBackupRunning = false;
  }
}

module.exports = {
  performBackup,
  getBackupStatus
};
