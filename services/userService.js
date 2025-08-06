// services/userService.js - Updated with database integration
const { User, Subscription, Usage } = require('../models');
const { Op } = require('sequelize');

// User management functions
const createUser = async (name, email, password) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create user (password will be hashed by model hook)
    const user = await User.create({
      name,
      email,
      password,
      plan: 'free'
    });

    // Create free subscription
    await Subscription.create({
      userId: user.id,
      plan: 'free',
      status: 'active'
    });

    // Initialize usage for current month
    const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM
    await Usage.create({
      userId: user.id,
      monthYear
    });

    return user.toJSON();
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

const findUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ 
      where: { email },
      include: [{
        model: Subscription,
        as: 'subscriptions',
        where: { status: 'active' },
        required: false,
        order: [['createdAt', 'DESC']],
        limit: 1
      }]
    });
    return user;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

const getUserById = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    return user;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    return null;
  }
};

const validatePassword = async (password, user) => {
  if (!user || !user.validatePassword) {
    return false;
  }
  return user.validatePassword(password);
};

// Subscription management
const getUserSubscription = async (userId) => {
  try {
    const subscription = await Subscription.findOne({
      where: { 
        userId,
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });
    return subscription;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
};

const updateUserSubscription = async (userId, subscriptionData) => {
  try {
    // Cancel existing active subscriptions
    await Subscription.update(
      { status: 'cancelled', cancelledAt: new Date() },
      { where: { userId, status: 'active' } }
    );

    // Create new subscription
    const subscription = await Subscription.create({
      userId,
      ...subscriptionData
    });

    // Update user's plan
    await User.update(
      { plan: subscriptionData.plan },
      { where: { id: userId } }
    );

    return subscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

// Usage tracking
const getUserUsage = async (userId) => {
  try {
    const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Find or create usage record for current month
    let usage = await Usage.findOne({
      where: { userId, monthYear }
    });

    if (!usage) {
      usage = await Usage.create({
        userId,
        monthYear,
        charactersUsed: 0,
        apiCalls: 0
      });
    }

    return {
      monthlyCharacters: usage.charactersUsed,
      apiCalls: usage.apiCalls,
      audioGenerated: usage.audioGenerated,
      lastReset: monthYear
    };
  } catch (error) {
    console.error('Error getting user usage:', error);
    return {
      monthlyCharacters: 0,
      apiCalls: 0,
      audioGenerated: 0,
      lastReset: new Date().toISOString().slice(0, 7)
    };
  }
};

const updateUsage = async (userId, characters, apiCall = 1) => {
  try {
    const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Find or create usage record
    const [usage, created] = await Usage.findOrCreate({
      where: { userId, monthYear },
      defaults: {
        charactersUsed: 0,
        apiCalls: 0,
        audioGenerated: 0
      }
    });

    // Update usage
    await usage.increment({
      charactersUsed: characters,
      apiCalls: apiCall,
      audioGenerated: 1
    });

    await usage.reload();

    return {
      monthlyCharacters: usage.charactersUsed,
      apiCalls: usage.apiCalls,
      audioGenerated: usage.audioGenerated
    };
  } catch (error) {
    console.error('Error updating usage:', error);
    throw error;
  }
};

// Update user login timestamp
const updateLastLogin = async (userId) => {
  try {
    await User.update(
      { lastLoginAt: new Date() },
      { where: { id: userId } }
    );
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

// Get user stats
const getUserStats = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          where: { status: 'active' },
          required: false
        },
        {
          model: Usage,
          as: 'usage',
          where: {
            monthYear: new Date().toISOString().slice(0, 7)
          },
          required: false
        }
      ]
    });

    return user;
  } catch (error) {
    console.error('Error getting user stats:', error);
    return null;
  }
};

module.exports = {
  createUser,
  findUserByEmail,
  getUserById,
  validatePassword,
  getUserSubscription,
  updateUserSubscription,
  getUserUsage,
  updateUsage,
  updateLastLogin,
  getUserStats
};
