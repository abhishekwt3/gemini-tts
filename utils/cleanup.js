// utils/cleanup.js - Updated with database cleanup
const fs = require('fs').promises;
const path = require('path');
const { cleanupExpiredAudio } = require('../services/audioService');

const uploadsDir = path.join(process.cwd(), 'uploads');

// Cleanup old audio files
const cleanupOldFiles = async () => {
  try {
    // Clean up database records and associated files
    const deletedCount = await cleanupExpiredAudio();
    
    // Also clean up orphaned files (files without database records)
    const files = await fs.readdir(uploadsDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let orphanedCount = 0;
    
    for (const file of files) {
      if (file.startsWith('gemini25-tts-') && file.endsWith('.wav')) {
        const filepath = path.join(uploadsDir, file);
        const stats = await fs.stat(filepath);
        
        // Check if file is old and not in database
        if (now - stats.mtime.getTime() > maxAge) {
          const { getAudioByFilename } = require('../services/audioService');
          const dbRecord = await getAudioByFilename(file);
          
          if (!dbRecord) {
            await fs.unlink(filepath);
            orphanedCount++;
            console.log(`🗑️ Cleaned up orphaned file: ${file}`);
          }
        }
      }
    }
    
    if (deletedCount > 0 || orphanedCount > 0) {
      console.log(`✅ Cleanup complete: ${deletedCount} expired, ${orphanedCount} orphaned files removed`);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Start cleanup job
const startCleanupJob = () => {
  // Run cleanup every hour
  setInterval(cleanupOldFiles, 60 * 60 * 1000);
  
  // Also run once on startup (after 5 seconds)
  setTimeout(cleanupOldFiles, 5000);
};

module.exports = {
  cleanupOldFiles,
  startCleanupJob
};