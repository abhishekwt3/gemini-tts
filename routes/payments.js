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

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
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

    console.log('Payment verification started:', {
      userId: req.user.id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      planId
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification data'
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
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
      console.error('Invalid payment signature for order:', razorpay_order_id);
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }

    console.log('Payment signature verified successfully');

    // Activate subscription
    const result = await activateSubscription(
      req.user.id, 
      planId, 
      razorpay_payment_id, 
      razorpay_order_id
    );

    console.log('Subscription activated successfully:', {
      userId: req.user.id,
      subscriptionId: result.subscription.id,
      plan: planId
    });

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription: {
        id: result.subscription.id,
        plan: planId,
        planName: result.plan.name,
        status: 'active',
        expiresAt: result.subscription.expiresAt
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

// Get payment history (optional endpoint for future use)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { getPaymentHistory } = require('../services/paymentService');
    const payments = await getPaymentHistory(req.user.id, 20);
    
    res.json({
      success: true,
      payments: payments.map(payment => ({
        id: payment.id,
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        plan: payment.plan,
        createdAt: payment.createdAt
      }))
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment history'
    });
  }
});

module.exports = router;