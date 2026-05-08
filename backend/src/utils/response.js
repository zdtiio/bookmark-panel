const successResponse = (data, message = '操作成功') => {
  return {
    success: true,
    code: 'SUCCESS',
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

const errorResponse = (message, code = 'ERROR', statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

module.exports = {
  successResponse,
  errorResponse
};