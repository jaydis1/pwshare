import express, { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Admin password from env or use default
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

interface ShareData {
  encrypted: any;
  expiresAt: number;
  createdAt: number;
  accessed: boolean;
}

// Store encrypted data and expiration times
const store = new Map<string, ShareData>();
const adminTokens = new Set<string>();

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Admin authentication middleware
function isAuthenticatedAdmin(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  if (!adminTokens.has(token)) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
}

// Admin login
app.post('/api/admin/auth', (req: Request, res: Response) => {
  const { password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  adminTokens.add(token);

  // Token expires after 1 hour
  setTimeout(() => {
    adminTokens.delete(token);
  }, 3600000);

  res.json({ token });
});

// Store encrypted password
app.post('/api/share', (req: Request, res: Response) => {
  const { encrypted, expiresIn } = req.body;

  if (!encrypted) {
    return res.status(400).json({ error: 'No data provided' });
  }

  const id = uuid();
  const createdAt = Date.now();
  const expirationTime = createdAt + expiresIn * 1000;

  store.set(id, {
    encrypted,
    expiresAt: expirationTime,
    createdAt,
    accessed: false
  });

  res.json({ id, expiresIn });
});

// Retrieve encrypted password
app.get('/api/share/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = store.get(id);

  if (!data) {
    return res.status(404).json({ error: 'Share not found or expired' });
  }

  if (Date.now() > data.expiresAt) {
    store.delete(id);
    return res.status(404).json({ error: 'Share expired' });
  }

  // Return encrypted data and delete immediately
  res.json({ encrypted: data.encrypted });
  store.delete(id);
});

// Admin: List all pastes
app.get('/api/admin/pastes', isAuthenticatedAdmin, (req: Request, res: Response) => {
  const pastes = Array.from(store.entries()).map(([id, data]) => ({
    id,
    createdAt: new Date(data.createdAt).toISOString(),
    expiresAt: new Date(data.expiresAt).toISOString(),
    accessed: data.accessed,
    expired: Date.now() > data.expiresAt
  }));

  res.json(pastes);
});

// Admin: Delete a paste
app.delete('/api/admin/pastes/:id', isAuthenticatedAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = store.delete(id);

  if (!deleted) {
    return res.status(404).json({ error: 'Paste not found' });
  }

  res.json({ success: true });
});

// Cleanup expired shares periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of store.entries()) {
    if (now > data.expiresAt) {
      store.delete(id);
    }
  }
}, 60000); // Check every minute

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
