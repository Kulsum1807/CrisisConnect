import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { ROLES } from '../constants/roles.js';
import { VERIFICATION_STATUSES, AVAILABILITY, RESPONDER_TYPES } from '../constants/responder.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';

// Hash helper for storing SHA-256 of the refresh token
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Register a standard Citizen User.
 * Ground rule: Role is ALWAYS forced to USER by the backend. Client role injection is ignored.
 */
export const registerUser = async ({ name, email, phone, password }) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409, 'DUPLICATE');
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    password: hashedPassword,
    role: ROLES.USER,
  });

  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store hashed refresh token on user document
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  // Return sanitized user (exclude password and hash)
  const sanitizedUser = user.toObject();
  delete sanitizedUser.password;
  delete sanitizedUser.refreshTokenHash;

  return { user: sanitizedUser, accessToken, refreshToken };
};

/**
 * Register a Responder.
 * Starts in PENDING verification status and OFFLINE availability until admin approval.
 */
export const registerResponder = async ({
  name,
  email,
  phone,
  password,
  responderType = RESPONDER_TYPES.PROFESSIONAL,
  organisation = '',
  referenceContact = '',
  specialization = [],
  verificationNote = '',
}) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409, 'DUPLICATE');
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    password: hashedPassword,
    role: ROLES.RESPONDER,
    responderProfile: {
      responderType,
      organisation,
      referenceContact,
      verificationStatus: VERIFICATION_STATUSES.PENDING,
      verificationNote,
      availability: AVAILABILITY.OFFLINE,
      specialization,
    },
  });

  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  const sanitizedUser = user.toObject();
  delete sanitizedUser.password;
  delete sanitizedUser.refreshTokenHash;

  return { user: sanitizedUser, accessToken, refreshToken };
};

/**
 * Authenticate User.
 * Ground rule: Same generic error message for incorrect email and wrong password to prevent user enumeration.
 * Rejects suspended accounts with 403 ACCOUNT_SUSPENDED immediately.
 */
export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password +refreshTokenHash'
  );

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHENTICATED');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHENTICATED');
  }

  if (!user.isActive) {
    throw new AppError('Your account has been suspended. Please contact support.', 403, 'ACCOUNT_SUSPENDED');
  }

  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  const sanitizedUser = user.toObject();
  delete sanitizedUser.password;
  delete sanitizedUser.refreshTokenHash;

  return { user: sanitizedUser, accessToken, refreshToken };
};

/**
 * Refresh tokens with token rotation.
 * Invalidates and rotates refresh token on each use.
 */
export const refreshTokens = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new AppError('Refresh token required', 401, 'UNAUTHENTICATED');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401, 'TOKEN_EXPIRED');
  }

  const user = await User.findById(decoded.userId).select('+refreshTokenHash');
  if (!user) {
    throw new AppError('User not found', 401, 'UNAUTHENTICATED');
  }

  if (!user.isActive) {
    throw new AppError('Account is suspended', 403, 'ACCOUNT_SUSPENDED');
  }

  // Check stored hash matches presented refresh token
  const incomingHash = hashToken(incomingRefreshToken);
  if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
    // Possible token reuse attack — invalidate stored token
    user.refreshTokenHash = null;
    await user.save();
    throw new AppError('Invalid refresh token. Please sign in again.', 401, 'UNAUTHENTICATED');
  }

  // Issue new pair (Rotation)
  const payload = { userId: user._id.toString(), role: user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Logout User.
 * Clears stored refresh token hash in DB.
 */
export const logoutUser = async (userId) => {
  if (userId) {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  }
};
