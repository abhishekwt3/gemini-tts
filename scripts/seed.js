const { sequelize } = require('../config/database');
const { User, Subscription, Usage } = require('../models');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    console.log('🔄 Starting database seeding...');
    
    // Check if already seeded
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('ℹ️ Database already contains data. Skipping seed.');
      process.exit(0);
    }
    
    // Create demo user
    const demoUser = await User.create({
      name: 'Demo User',
      email: 'demo@example.com',
      password: 'demo123',
      plan: 'free',
      emailVerified: true
    });
    
    console.log('✅ Created demo user: demo@example.com / demo123');
    
    // Create free subscription
    await Subscription.create({
      userId: demoUser.id,
      plan: 'free',
      status: 'active'
    });
    
    // Initialize usage
    const monthYear = new Date().toISOString().slice(0, 7);
    await Usage.create({
      userId: demoUser.id,
      monthYear,
      charactersUsed: 0,
      apiCalls: 0
    });
    
    console.log('✅ Database seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();