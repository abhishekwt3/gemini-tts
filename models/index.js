const User = require('./User');
const Subscription = require('./Subscription');
const Usage = require('./Usage');
const AudioFile = require('./AudioFile');
const Payment = require('./Payment');

// Define associations
function setupAssociations() {
  // User has many Subscriptions
  User.hasMany(Subscription, { 
    foreignKey: 'userId', 
    as: 'subscriptions' 
  });
  Subscription.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });

  // User has many Usage records
  User.hasMany(Usage, { 
    foreignKey: 'userId', 
    as: 'usage' 
  });
  Usage.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });

  // User has many AudioFiles
  User.hasMany(AudioFile, { 
    foreignKey: 'userId', 
    as: 'audioFiles' 
  });
  AudioFile.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });

  // User has many Payments
  User.hasMany(Payment, { 
    foreignKey: 'userId', 
    as: 'payments' 
  });
  Payment.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });

  // Subscription has many Payments
  Subscription.hasMany(Payment, { 
    foreignKey: 'subscriptionId', 
    as: 'payments' 
  });
  Payment.belongsTo(Subscription, { 
    foreignKey: 'subscriptionId', 
    as: 'subscription' 
  });

  console.log('✅ Model associations established');
}

module.exports = {
  User,
  Subscription,
  Usage,
  AudioFile,
  Payment,
  setupAssociations
};