import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Candidate } from '../models/Candidate.js';
import { Admin } from '../models/Admin.js';
import env from '../config/environment.js';
import ApiError from '../utils/ApiError.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication token missing or invalid format'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Session expired. Please log in again.'));
    }
    return next(ApiError.unauthorized('Invalid or forged authentication token'));
  }
};

export const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return next(ApiError.forbidden('Access denied. Administrator privileges required.'));
  }

  if (mongoose.isValidObjectId(req.user.id)) {
    try {
      const admin = await Admin.findById(req.user.id);
      if (admin) {
        if (!admin.isActive) {
          return next(ApiError.forbidden('Admin account has been deactivated'));
        }
        req.admin = admin;
      }
    } catch (err) {
      return next(err);
    }
  }

  next();
};

export const requireCandidate = async (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (req.user.role !== 'candidate') {
    return next(ApiError.forbidden('Access denied. Candidate session required.'));
  }

  if (mongoose.isValidObjectId(req.user.id)) {
    try {
      const candidate = await Candidate.findById(req.user.id);
      if (candidate) {
        req.candidate = candidate;
      }
    } catch (err) {
      // Continue or pass to error handler
    }
  }

  next();
};

export default {
  authenticateToken,
  requireAdmin,
  requireCandidate,
};
