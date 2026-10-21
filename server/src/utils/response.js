export function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

export function failure(res, { message, code, errors, statusCode = 500 }) {
  const body = { success: false, message, code };
  if (errors?.length) body.errors = errors;
  return res.status(statusCode).json(body);
}
