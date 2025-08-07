const crypto = require('crypto');
const { PRICING_PLANS } = require('../config/constants');
const { Payment, Subscription, User } = require('../models');
const { sequelize } = require('../config/database');

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
    throw new Error('Invalid plan');
  }

  const transaction = await sequelize.transaction();
  
  try {
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

    // Cancel existing active subscriptions
    await Subscription.update(
      { 
        status: 'cancelled', 
        cancelledAt: new Date() 
      },
      { 
        where: { userId, status: 'active' },
        transaction 
      }
    );

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

    // Update payment with subscription ID
    payment.subscriptionId = subscription.id;
    await payment.save({ transaction });

    // Update user's plan
    await User.update(
      { plan: planId },
      { 
        where: { id: userId },
        transaction 
      }
    );

    // Reset usage for new subscription
    const monthYear = new Date().toISOString().slice(0, 7);
    const Usage = require('../models/Usage');
    await Usage.update(
      { charactersUsed: 0, apiCalls: 0 },
      { 
        where: { userId, monthYear },
        transaction 
      }
    );

    await transaction.commit();

    return {
      subscription,
      plan
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error activating subscription:', error);
    throw error;
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
        expiresAt: {
          [Op.gt]: new Date()
        }
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