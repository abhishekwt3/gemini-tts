// routes/user.js - Fixed dashboard route with better error handling
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { PRICING_PLANS } = require('../config/constants');
const { 
  getUserSubscription, 
  getUserUsage,
  getUserById 
} = require('../services/userService');

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data from database to ensure we have all fields
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userSub = await getUserSubscription(userId) || { plan: 'free', status: 'active' };
    
    // Ensure we have a valid plan, fallback to free if not found
    let planKey = userSub.plan;
    if (!PRICING_PLANS[planKey]) {
      console.warn(`Invalid plan '${planKey}' for user ${userId}, falling back to free`);
      planKey = 'free';
    }
    
    const plan = PRICING_PLANS[planKey];
    const usage = await getUserUsage(userId);

    // Ensure we have all required user fields
    const userData = {
      id: userId,
      email: user.email,
      name: user.name || user.email.split('@')[0] // Fallback to email prefix if name is missing
    };

    res.json({
      success: true,
      dashboard: {
        user: userData,
        subscription: {
          plan: planKey,
          planName: plan.name,
          status: userSub.status || 'active',
          expiresAt: userSub.expiresAt
        },
        usage: {
          monthlyCharacters: usage.monthlyCharacters || 0,
          monthlyCharactersLimit: plan.limits.monthlyCharacters,
          apiCalls: usage.apiCalls || 0,
          apiCallsLimit: plan.limits.apiCalls,
          charactersRemaining: plan.limits.monthlyCharacters === -1 ? 
            'Unlimited' : 
            Math.max(0, plan.limits.monthlyCharacters - (usage.monthlyCharacters || 0))
        },
        features: plan.features,
        availableVoices: plan.limits.voices
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard'
    });
  }
});

module.exports = router;