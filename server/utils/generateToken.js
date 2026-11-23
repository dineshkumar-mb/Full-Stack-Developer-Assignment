import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import env from '../config/environment.js';

export const generateToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};

export const hashPassword = async (password, saltRounds = env.BCRYPT_SALT_ROUNDS) => {
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

export default {
  generateToken,
  hashPassword,
  comparePassword,
};
