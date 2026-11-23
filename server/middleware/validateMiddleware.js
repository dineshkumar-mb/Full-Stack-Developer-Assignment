import ApiError from '../utils/ApiError.js';

export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const errorMessages = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
        return next(ApiError.badRequest('Input validation failed', errorMessages));
      }

      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
};

export default validate;
