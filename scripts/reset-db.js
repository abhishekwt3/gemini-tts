const { sequelize } = require('../config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetDatabase() {
  console.log('⚠️  WARNING: This will delete all data in the database!');
  
  rl.question('Are you sure you want to continue? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Database reset cancelled');
      process.exit(0);
    }
    
    try {
      console.log('🔄 Resetting database...');
      
      // Drop all tables
      await sequelize.drop();
      console.log('✅ All tables dropped');
      
      // Recreate tables
      await sequelize.sync({ force: true });
      console.log('✅ Tables recreated');
      
      console.log('✅ Database reset completed');
      console.log('ℹ️  Run "npm run db:seed" to add demo data');
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Reset failed:', error);
      process.exit(1);
    } finally {
      rl.close();
    }
  });
}

resetDatabase();
