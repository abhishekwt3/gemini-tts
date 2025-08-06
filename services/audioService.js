const { AudioFile } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

const saveAudioRecord = async (audioData) => {
  try {
    const audioFile = await AudioFile.create({
      userId: audioData.userId || null,
      filename: audioData.filename,
      text: audioData.text,
      textLength: audioData.text.length,
      voice: audioData.voice,
      language: audioData.language,
      duration: audioData.duration || null,
      fileSize: audioData.fileSize || null,
      settings: {
        speed: audioData.speed,
        pitch: audioData.pitch,
        style: audioData.style
      },
      ipAddress: audioData.ipAddress || null,
      userAgent: audioData.userAgent || null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    return audioFile;
  } catch (error) {
    console.error('Error saving audio record:', error);
    throw error;
  }
};

const getAudioByFilename = async (filename) => {
  try {
    const audioFile = await AudioFile.findOne({
      where: { filename }
    });
    return audioFile;
  } catch (error) {
    console.error('Error getting audio file:', error);
    return null;
  }
};

const getUserAudioHistory = async (userId, limit = 20) => {
  try {
    const audioFiles = await AudioFile.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
    return audioFiles;
  } catch (error) {
    console.error('Error getting user audio history:', error);
    return [];
  }
};

const cleanupExpiredAudio = async () => {
  try {
    // Find expired audio files
    const expiredFiles = await AudioFile.findAll({
      where: {
        expiresAt: {
          [Op.lt]: new Date()
        }
      }
    });

    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    for (const file of expiredFiles) {
      // Delete physical file
      const filepath = path.join(uploadsDir, file.filename);
      try {
        await fs.unlink(filepath);
        console.log(`🗑️ Deleted expired audio file: ${file.filename}`);
      } catch (err) {
        console.error(`Failed to delete file ${file.filename}:`, err);
      }

      // Delete database record
      await file.destroy();
    }

    console.log(`✅ Cleaned up ${expiredFiles.length} expired audio files`);
    return expiredFiles.length;
  } catch (error) {
    console.error('Error cleaning up expired audio:', error);
    return 0;
  }
};

module.exports = {
  saveAudioRecord,
  getAudioByFilename,
  getUserAudioHistory,
  cleanupExpiredAudio
};