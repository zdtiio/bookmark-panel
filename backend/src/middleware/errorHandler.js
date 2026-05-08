const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';
  let code = err.code || 'INTERNAL_ERROR';

  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const validationErrors = err.errors.map(e => {
      let field = e.path;
      let msg = e.message;
      
      if (e.type === 'isUrl' || e.message.includes('isUrl')) {
        msg = `${field} 不是有效的URL地址`;
      } else if (e.type === 'notNull Violation' || e.message.includes('allowNull')) {
        msg = `${field} 不能为空`;
      } else if (e.type === 'unique violation' || e.message.includes('unique')) {
        msg = `${field} 已存在`;
      } else if (e.validatorKey === 'isUrl') {
        msg = `${field} 不是有效的URL地址`;
      }
      
      return { field, message: msg };
    });
    message = validationErrors.map(v => v.message).join('; ') || '数据验证失败';
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    code = 'DUPLICATE_ERROR';
    message = '数据已存在';
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    code = 'INVALID_REFERENCE';
    message = '引用的数据不存在';
  } else if (statusCode === 500) {
    message = '服务器内部错误，请稍后重试';
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;