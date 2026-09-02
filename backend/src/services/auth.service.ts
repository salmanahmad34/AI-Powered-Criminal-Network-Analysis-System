import bcrypt from 'bcrypt';
import { UserRole, UserStatus, AuditAction } from '@prisma/client';
import prisma from '../config/database';
import { generateTokens } from '../middleware/auth';
import { recordAudit } from '../middleware/audit';
import logger from '../utils/logger';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface LoginResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
    mustChangePassword?: boolean;
  };
  error?: string;
}

/**
 * Authenticate user credentials.
 * Implements:
 * - bcrypt password verification
 * - Account locking after 5 failed attempts
 * - Audit logging for login/failure
 * - Never logs credentials
 */
export async function loginUser(
  email: string,
  password: string,
  ipAddress?: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // SECURITY: Generic error — don't reveal whether email exists
    return { success: false, error: 'Invalid email or password.' };
  }

  // Check account status
  if (user.status === UserStatus.INACTIVE) {
    return { success: false, error: 'Account is deactivated. Contact administrator.' };
  }

  // Check if account is locked
  if (user.status === UserStatus.LOCKED || (user.lockedUntil && user.lockedUntil > new Date())) {
    return { success: false, error: 'Account is temporarily locked. Try again later.' };
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    // Increment failed login count
    const newCount = user.failedLoginCount + 1;
    const updateData: Record<string, unknown> = { failedLoginCount: newCount };

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      updateData.status = UserStatus.LOCKED;
      updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      logger.warn(`Account locked due to ${MAX_FAILED_ATTEMPTS} failed attempts: ${user.id}`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await recordAudit(user.id, AuditAction.LOGIN_FAILED, 'user', user.id, undefined, ipAddress);

    return { success: false, error: 'Invalid email or password.' };
  }

  // Successful login — reset failed count, update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      status: UserStatus.ACTIVE,
      lastLogin: new Date(),
    },
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  await recordAudit(user.id, AuditAction.LOGIN, 'user', user.id, undefined, ipAddress);

  return {
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      mustChangePassword: user.mustChangePassword ?? false,
    },
  };
}

/**
 * Hash a password with bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Change user password and clear mustChangePassword flag.
 */
export async function changePassword(userId: string, newPassword: string): Promise<boolean> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });
  return true;
}

/**
 * Get current user profile from database.
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      status: true,
      mustChangePassword: true,
      lastLogin: true,
      mfaEnabled: true,
      createdAt: true,
    },
  });

  return user;
}
