const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  createPaymentOrder, 
  verifyPayment, 
  activateSubscription 
} = require('../services/paymentService');

// Create Razorpay order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const razorpay = req.app.locals.services.razorpay;

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Payment service not available'
      });
    }

    const order = await createPaymentOrder(
      razorpay, 
      req.user.id, 
      req.user.email, 
      planId
    );

    res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment order'
    });
  }
});

// Verify payment and activate subscription
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      planId 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification data'
      });
    }

    // Verify signature
    const isValid = verifyPayment(
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }

    // Activate subscription
    const { subscription, plan } = activateSubscription(
      req.user.id, 
      planId, 
      razorpay_payment_id, 
      razorpay_order_id
    );

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription: {
        plan: planId,
        planName: plan.name,
        status: 'active',
        expiresAt: subscription.expiresAt
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment'
    });
  }
});

module.exports = router;