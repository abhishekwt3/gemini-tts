const crypto = require('crypto');
const { PRICING_PLANS } = require('../config/constants');
const { Payment, Subscription, User, Usage } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const createPaymentOrder = async (razorpay, userId, userEmail, planId) => {
  const plan = PRICING_PLANS[planId];
  
  if (!plan) {
    throw new Error('Invalid plan selected');
  }

  // Create short receipt ID (max 40 chars for Razorpay)
  const shortUserId = userId.substring(0, 8); // First 8 chars of UUID
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  const receipt = `rcpt_${shortUserId}_${timestamp}`; // Format: rcpt_12345678_87654321 (max 25 chars)

  const options = {
    amount: plan.price * 100, // Amount in paise
    currency: plan.currency,
    receipt: receipt,
    payment_capture: 1,
    notes: {
      planId: plan.id,
      userId: userId,
      userEmail: userEmail
    }
  };

  const order = await razorpay.orders.create(options);
  
  // Save payment record with pending status
  await Payment.create({
    userId,
    orderId: order.id,
    amount: plan.price,
    currency: plan.currency,
    status: 'pending',
    plan: planId,
    metadata: {
      razorpayOrderData: order,
      shortReceipt: receipt
    }
  });
  
  return {
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    planId: plan.id,
    planName: plan.name
  };
};

const verifyPayment = (orderId, paymentId, signature, keySecret) => {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === signature;
};

const activateSubscription = async (userId, planId, paymentId, orderId) => {
  const plan = PRICING_PLANS[planId];
  
  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  const transaction = await sequelize.transaction();
  
  try {
    console.log(`Activating subscription for user ${userId}, plan ${planId}`);
    
    // Update payment record
    const payment = await Payment.findOne({
      where: { orderId },
      transaction
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    payment.paymentId = paymentId;
    payment.status = 'completed';
    await payment.save({ transaction });

    console.log('Payment record updated');

    // Cancel existing active subscriptions
    const cancelledCount = await Subscription.update(
      { 
        status: 'cancelled', 
        cancelledAt: new Date() 
      },
      { 
        where: { userId, status: 'active' },
        transaction 
      }
    );

    console.log(`Cancelled ${cancelledCount[0]} existing subscriptions`);

    // Create new subscription
    const subscription = await Subscription.create({
      userId,
      plan: planId,
      status: 'active',
      paymentId,
      orderId,
      amount: plan.price,
      currency: plan.currency,
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }, { transaction });

    console.log('New subscription created:', subscription.id);

    // Update payment with subscription ID
    payment.subscriptionId = subscription.id;
    await payment.save({ transaction });

    // Update user's plan
    const userUpdateResult = await User.update(
      { plan: planId },
      { 
        where: { id: userId },
        transaction 
      }
    );

    console.log(`User plan updated, affected rows: ${userUpdateResult[0]}`);

    // Reset usage for new subscription
    const monthYear = new Date().toISOString().slice(0, 7);
    
    // Find or create usage record for current month
    const [usage, created] = await Usage.findOrCreate({
      where: { userId, monthYear },
      defaults: {
        charactersUsed: 0,
        apiCalls: 0,
        audioGenerated: 0
      },
      transaction
    });

    if (!created) {
      // Reset existing usage
      await usage.update({
        charactersUsed: 0,
        apiCalls: 0
      }, { transaction });
    }

    console.log('Usage reset for new subscription');

    await transaction.commit();
    console.log('Transaction committed successfully');

    return {
      subscription,
      plan
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error activating subscription:', error);
    throw new Error(`Failed to activate subscription: ${error.message}`);
  }
};

const getPaymentHistory = async (userId, limit = 10) => {
  try {
    const payments = await Payment.findAll({
      where: { userId },
      include: [{
        model: Subscription,
        as: 'subscription',
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit
    });
    return payments;
  } catch (error) {
    console.error('Error getting payment history:', error);
    return [];
  }
};

const getSubscriptionStatus = async (userId) => {
  try {
    const subscription = await Subscription.findOne({
      where: { 
        userId,
        status: 'active',
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    if (!subscription) {
      return { active: false, plan: 'free' };
    }

    return {
      active: true,
      plan: subscription.plan,
      expiresAt: subscription.expiresAt
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return { active: false, plan: 'free' };
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  activateSubscription,
  getPaymentHistory,
  getSubscriptionStatus
};