const errorHandler = (error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  // Send appropriate error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = {
  errorHandler
};