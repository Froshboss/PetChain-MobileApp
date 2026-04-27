import express from 'express';

import { authenticateJWT, authorizeRoles, type AuthenticatedRequest } from '../../middleware/auth';
import { UserRole } from '../../models/UserRole';
import { ok, sendError } from '../response';
import { userRepository, type DBUser } from '../../src/repositories/userRepository';
import { store } from '../store';

const router = express.Router();

function sanitize(u: DBUser) {
  const { password_hash: _p, ...rest } = u;
  return {
    ...rest,
    isEmailVerified: u.is_email_verified,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

router.get('/me', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const user = store.users.get(req.user!.id);
  if (!user) return sendError(res, 404, 'NOT_FOUND', 'User not found');
  return res.json(ok(sanitize(user)));
});

router.get('/', authenticateJWT, authorizeRoles(UserRole.ADMIN), (req, res) => {
  const role = req.query.role as string | undefined;
  const search = (req.query.search as string | undefined)?.toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  let users = await userRepository.findAll();
  
  if (role) users = users.filter((u) => u.role === role);
  if (search) {
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        u.name.toLowerCase().includes(search) ||
        u.id.toLowerCase().includes(search),
    );
  }
  
  const total = users.length;
  const start = (page - 1) * limit;
  const slice = users.slice(start, start + limit).map(sanitize);
  const totalPages = Math.ceil(total / limit) || 1;

  return res.json({
    success: true,
    data: slice,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get('/:id', authenticateJWT, (req, res) => {
  const user = store.users.get(req.params.id);
  if (!user) return sendError(res, 404, 'NOT_FOUND', 'User not found');
  return res.json(ok(sanitize(user)));
});

router.post('/', async (req, res) => {
  const { email, name, phone, role } = req.body;
  if (!email?.trim() || !name?.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'email and name are required');
  }
  
  const existing = await userRepository.findByEmail(email.trim().toLowerCase());
  if (existing) {
    return sendError(res, 409, 'CONFLICT', 'Email already registered');
  }

  const id = store.newId();
  const user = await userRepository.create({
    id,
    email: email.trim(),
    name: name.trim(),
    phone: phone?.trim(),
    role: (role as UserRole) || UserRole.OWNER,
    is_email_verified: false,
  });

  return res.status(201).json(ok(sanitize(user), 'User created'));
});

router.put('/:id', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const user = store.users.get(req.params.id);
  if (!user) return sendError(res, 404, 'NOT_FOUND', 'User not found');
  
  // Only admin or the user themselves can update
  if (req.user!.role !== UserRole.ADMIN && req.user!.id !== req.params.id) {
    return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to update this user');
  }

  const { name, phone, role, isEmailVerified } = req.body as Partial<StoredUser>;
  const next: StoredUser = {
    ...user,
    ...(name !== undefined ? { name: String(name) } : {}),
    ...(phone !== undefined ? { phone: String(phone) } : {}),
    ...(role !== undefined && req.user!.role === UserRole.ADMIN ? { role: role as UserRole } : {}),
    ...(isEmailVerified !== undefined && req.user!.role === UserRole.ADMIN ? { isEmailVerified: Boolean(isEmailVerified) } : {}),
    updatedAt: new Date().toISOString(),
  };
  store.users.set(user.id, next);
  return res.json(ok(sanitize(next), 'User updated'));
});

router.delete('/:id', authenticateJWT, authorizeRoles(UserRole.ADMIN), (req, res) => {
  if (!store.users.delete(req.params.id)) {
    return sendError(res, 404, 'NOT_FOUND', 'User not found');
  }
  return res.json(ok(null, 'User deleted'));
});

export default router;
