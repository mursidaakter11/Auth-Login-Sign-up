import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  lastSignedInAt: string;
  authMethod: string;
}

interface PersistedStore {
  users: StoredUser[];
  sessions: Record<string, { userId: string; createdAt: string }>;
  otpCodes: Record<string, { code: string; expiresAt: number }>;
  resetCodes: Record<string, { code: string; expiresAt: number }>;
}

const STORE_FILE = path.join(os.tmpdir(), 'kanso-auth-store.json');
const PORT = Number(process.env.PORT) || 3000;

function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function createInitialStore(): PersistedStore {
  const demoPass = hashPassword('Kanso2026!');
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: 'usr_demo_kanso',
        fullName: 'Mainul Abedin',
        email: 'demo@kanso.design',
        role: 'Design Lead',
        passwordSalt: demoPass.salt,
        passwordHash: demoPass.hash,
        createdAt: now,
        lastSignedInAt: now,
        authMethod: 'Password',
      },
    ],
    sessions: {},
    otpCodes: {},
    resetCodes: {},
  };
}

function loadStore(): PersistedStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedStore;
      if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        const demoUser = parsed.users.find((u) => u.id === 'usr_demo_kanso');
        if (demoUser && demoUser.fullName !== 'Mainul Abedin') {
          demoUser.fullName = 'Mainul Abedin';
        }
        const loaded: PersistedStore = {
          users: parsed.users,
          sessions: parsed.sessions ?? {},
          otpCodes: parsed.otpCodes ?? {},
          resetCodes: parsed.resetCodes ?? {},
        };
        saveStore(loaded);
        return loaded;
      }
    }
  } catch {
    // Fall back to fresh store if temp store is unreadable.
  }
  const fresh = createInitialStore();
  saveStore(fresh);
  return fresh;
}

function saveStore(store: PersistedStore): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Non-fatal in ephemeral containers.
  }
}

function toPublicUser(user: StoredUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    authMethod: user.authMethod,
    createdAt: user.createdAt,
    lastSignedInAt: user.lastSignedInAt,
  };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const store = loadStore();

  app.post('/api/auth/signup', (req: Request, res: Response) => {
    const fullName = String(req.body?.fullName ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const role = String(req.body?.role ?? 'Member').trim() || 'Member';

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }

    const existing = store.users.find((u) => u.email === email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });
      return;
    }

    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      fullName,
      email,
      role,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: now,
      lastSignedInAt: now,
      authMethod: 'Password',
    };

    store.users.push(newUser);
    const token = crypto.randomBytes(24).toString('hex');
    store.sessions[token] = { userId: newUser.id, createdAt: now };
    saveStore(store);

    res.status(201).json({
      user: toPublicUser(newUser),
      token,
    });
  });

  app.post('/api/auth/otp-request', (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    const code = String(crypto.randomInt(100000, 999999));
    store.otpCodes[email] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    saveStore(store);

    res.json({
      message: 'One-time sign-in code generated.',
      previewCode: code,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const method = req.body?.method === 'otp' ? 'otp' : 'password';
    const password = String(req.body?.password ?? '');
    const otpCode = String(req.body?.otpCode ?? '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    let user = store.users.find((u) => u.email === email);

    if (method === 'otp') {
      const record = store.otpCodes[email];
      if (!record || record.expiresAt < Date.now() || record.code !== otpCode) {
        res.status(401).json({ error: 'Invalid or expired 6-digit code.' });
        return;
      }
      delete store.otpCodes[email];

      if (!user) {
        const localName = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const randomPass = hashPassword(crypto.randomBytes(16).toString('hex'));
        const now = new Date().toISOString();
        user = {
          id: `usr_${crypto.randomUUID().slice(0, 8)}`,
          fullName: localName || 'Kanso Member',
          email,
          role: 'Member',
          passwordSalt: randomPass.salt,
          passwordHash: randomPass.hash,
          createdAt: now,
          lastSignedInAt: now,
          authMethod: 'One-time code',
        };
        store.users.push(user);
      } else {
        user.authMethod = 'One-time code';
      }
    } else {
      if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      user.authMethod = 'Password';
    }

    const now = new Date().toISOString();
    user.lastSignedInAt = now;
    const token = crypto.randomBytes(24).toString('hex');
    store.sessions[token] = { userId: user.id, createdAt: now };
    saveStore(store);

    res.json({
      user: toPublicUser(user),
      token,
    });
  });

  app.post('/api/auth/oauth-demo', (req: Request, res: Response) => {
    const provider = req.body?.provider === 'github' ? 'github' : 'google';
    const profile =
      provider === 'github'
        ? {
            fullName: 'Dev Patel',
            email: 'dev.patel@kanso.dev',
            role: 'Staff Engineer',
            authMethod: 'GitHub SSO',
          }
        : {
            fullName: 'Sora Takahashi',
            email: 'sora@kanso.studio',
            role: 'Product Designer',
            authMethod: 'Google SSO',
          };

    const now = new Date().toISOString();
    let user = store.users.find((u) => u.email === profile.email);
    if (!user) {
      const randomPass = hashPassword(crypto.randomBytes(16).toString('hex'));
      user = {
        id: `usr_${crypto.randomUUID().slice(0, 8)}`,
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
        passwordSalt: randomPass.salt,
        passwordHash: randomPass.hash,
        createdAt: now,
        lastSignedInAt: now,
        authMethod: profile.authMethod,
      };
      store.users.push(user);
    } else {
      user.lastSignedInAt = now;
      user.authMethod = profile.authMethod;
    }

    const token = crypto.randomBytes(24).toString('hex');
    store.sessions[token] = { userId: user.id, createdAt: now };
    saveStore(store);

    res.json({
      user: toPublicUser(user),
      token,
    });
  });

  app.post('/api/auth/reset-request', (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    const code = String(crypto.randomInt(100000, 999999));
    store.resetCodes[email] = {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    saveStore(store);

    res.json({
      message: 'Reset instructions sent.',
      previewCode: code,
    });
  });

  app.post('/api/auth/reset-confirm', (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const code = String(req.body?.code ?? '').trim();
    const newPassword = String(req.body?.newPassword ?? '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }

    const record = store.resetCodes[email];
    if (!record || record.expiresAt < Date.now() || record.code !== code) {
      res.status(400).json({ error: 'Invalid or expired reset code.' });
      return;
    }

    let user = store.users.find((u) => u.email === email);
    const { salt, hash } = hashPassword(newPassword);
    const now = new Date().toISOString();

    if (!user) {
      const localName = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      user = {
        id: `usr_${crypto.randomUUID().slice(0, 8)}`,
        fullName: localName || 'Kanso Member',
        email,
        role: 'Member',
        passwordSalt: salt,
        passwordHash: hash,
        createdAt: now,
        lastSignedInAt: now,
        authMethod: 'Password reset',
      };
      store.users.push(user);
    } else {
      user.passwordSalt = salt;
      user.passwordHash = hash;
      user.lastSignedInAt = now;
      user.authMethod = 'Password reset';
    }

    delete store.resetCodes[email];
    const token = crypto.randomBytes(24).toString('hex');
    store.sessions[token] = { userId: user.id, createdAt: now };
    saveStore(store);

    res.json({
      user: toPublicUser(user),
      token,
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (!token || !store.sessions[token]) {
      res.status(401).json({ error: 'Session expired or unauthorized.' });
      return;
    }
    const session = store.sessions[token];
    const user = store.users.find((u) => u.id === session.userId);
    if (!user) {
      res.status(401).json({ error: 'Account not found.' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  });

  app.patch('/api/auth/profile', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (!token || !store.sessions[token]) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const session = store.sessions[token];
    const user = store.users.find((u) => u.id === session.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const fullName = String(req.body?.fullName ?? '').trim();
    const role = String(req.body?.role ?? '').trim();

    if (fullName.length >= 2) user.fullName = fullName;
    if (role.length >= 2) user.role = role;
    saveStore(store);

    res.json({ user: toPublicUser(user) });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (token && store.sessions[token]) {
      delete store.sessions[token];
      saveStore(store);
    }
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
