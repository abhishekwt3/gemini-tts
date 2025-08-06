// middleware/usageLimits.js - Updated with database
const { PRICING_PLANS } = require('../config/constants');
const { getUserSubscription, getUserUsage } = require('../services/userService');

const checkUsageLimits = async (req, res, next) => {
  try {
    // For non-authenticated users (free tier)
    if (!req.user) {
      req.userPlan = PRICING_PLANS.free;
      req.userUsage = { monthlyCharacters: 0, apiCalls: 0 };
      return next();
    }

    const userId = req.user.id;
    const userSub = await getUserSubscription(userId) || { plan: 'free' };
    const plan = PRICING_PLANS[userSub.plan];
    const usage = await getUserUsage(userId);

    // Check character limit
    const textLength = req.body.text ? req.body.text.length : 0;
    if (plan.limits.monthlyCharacters !== -1 && 
        usage.monthlyCharacters + textLength > plan.limits.monthlyCharacters) {
      return res.status(429).json({
        success: false,
        error: 'Monthly character limit exceeded. Please upgrade your plan.',
        usage: usage,
        limit: plan.limits
      });
    }

    // Check API call limit
    if (plan.limits.apiCalls !== -1 && usage.apiCalls >= plan.limits.apiCalls) {
      return res.status(429).json({
        success: false,
        error: 'Monthly API call limit exceeded. Please upgrade your plan.',
        usage: usage,
        limit: plan.limits
      });
    }

    req.userPlan = plan;
    req.userUsage = usage;
    next();
  } catch (error) {
    console.error('Error checking usage limits:', error);
    // Allow request to continue on error
    req.userPlan = PRICING_PLANS.free;
    req.userUsage = { monthlyCharacters: 0, apiCalls: 0 };
    next();
  }
};

module.exports = {
  checkUsageLimits
};