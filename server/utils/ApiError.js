export class ApiError extends Error {
  constructor(statusCode, message, errors = [], isOperational = true, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    this.code = code;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized access', errors = []) {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = 'Forbidden access', errors = []) {
    return new ApiError(403, message, errors);
  }

  static notFound(message = 'Resource not found', errors = []) {
    return new ApiError(404, message, errors);
  }

  static conflict(message = 'Conflict with existing data', errors = []) {
    return new ApiError(409, message, errors);
  }

  static alreadyFinalized(message = 'Assessment has already been finalized') {
    return new ApiError(400, message, [], true, 'ATTEMPT_ALREADY_FINALIZED');
  }

  static internal(message = 'Internal server error', errors = []) {
    return new ApiError(500, message, errors);
  }
}

export default ApiError;
