// routes/user.js - User dashboard and management routes
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
router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const user = getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userSub = getUserSubscription(userId) || { plan: 'free', status: 'active' };
    const plan = PRICING_PLANS[userSub.plan];
    const usage = getUserUsage(userId);

    res.json({
      success: true,
      dashboard: {
        user: {
          id: userId,
          email: req.user.email,
          name: req.user.name
        },
        subscription: {
          plan: userSub.plan,
          planName: plan.name,
          status: userSub.status,
          expiresAt: userSub.expiresAt
        },
        usage: {
          monthlyCharacters: usage.monthlyCharacters,
          monthlyCharactersLimit: plan.limits.monthlyCharacters,
          apiCalls: usage.apiCalls,
          apiCallsLimit: plan.limits.apiCalls,
          charactersRemaining: plan.limits.monthlyCharacters === -1 ? 
            'Unlimited' : 
            Math.max(0, plan.limits.monthlyCharacters - usage.monthlyCharacters)
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


