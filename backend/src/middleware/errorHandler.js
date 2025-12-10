function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({ 
      error: 'Duplicate entry or constraint violation',
      message: err.message 
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}

module.exports = errorHandler;

