// config/database.js - Database configuration and connection
const { Sequelize } = require('sequelize');
const path = require('path');

// Determine database configuration based on environment
const env = process.env.NODE_ENV || 'development';

// Database configurations
const dbConfig = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database.sqlite'),
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true
    }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    }
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'gemini_tts',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig[env]);

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log(`✅ Database connection established (${env} mode using ${dbConfig[env].dialect})`);
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    return false;
  }
}

// Initialize database (create tables if they don't exist)
async function initializeDatabase() {
  try {
    // Sync all models
    await sequelize.sync({ alter: false });
    console.log('✅ Database tables synchronized');
    
    // Run any initial data seeding
    await seedDatabase();
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    return false;
  }
}

// Seed initial data if needed
async function seedDatabase() {
  try {
    // Check if we need to seed data
    const User = require('../models/User');
    const userCount = await User.count();
    
    if (userCount === 0) {
      console.log('📝 Database is empty, ready for first user registration');
    }
  } catch (error) {
    console.error('Error during database seeding:', error);
  }
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  initializeDatabase
};