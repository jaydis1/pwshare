import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sodium } from 'sodium-plus';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

interface ShareData {
  encrypted: string;
  expiresAt: number;
  expiresIn: number;
}

const store = new Map<string, ShareData>();

app.use(express.static(path.join(__dirname, '..')));
app.use(express.json());

// Admin authentication middleware
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// Store encrypted password
app.post('/api/share', (req: Request, res: Response): void => {
  const { encrypted, expiresIn } = req.body;

  if (!encrypted) {
    res.status(400).json({ error: 'No data provided' });
    return;
  }

  const id = uuid();
  const expirationTime = Date.now() + expiresIn * 1000;

  store.set(id, {
    encrypted,
    expiresAt: expirationTime,
    expiresIn
  });

  res.json({ id, expiresIn });
});

// Retrieve encrypted password
app.get('/api/share/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const data = store.get(id);

  if (!data) {
    res.status(404).json({ error: 'Share not found or expired' });
    return;
  }

  if (Date.now() > data.expiresAt) {
    store.delete(id);
    res.status(404).json({ error: 'Share expired' });
    return;
  }

  // Return encrypted data and delete after retrieval
  res.json({ encrypted: data.encrypted });
  store.delete(id);
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

// Admin endpoints
app.get('/api/admin/pastes', adminAuth, (req: Request, res: Response): void => {
  const pastes = Array.from(store.entries()).map(([id, data]) => ({
    id,
    createdAt: new Date(data.expiresAt - data.expiresIn * 1000).toISOString(),
    expiresAt: new Date(data.expiresAt).toISOString(),
    expiresIn: Math.ceil((data.expiresAt - Date.now()) / 1000),
    size: data.encrypted.length
  }));

  res.json({ total: pastes.length, pastes });
});

app.delete('/api/admin/pastes/:id', adminAuth, (req: Request, res: Response): void => {
  const { id } = req.params;

  if (store.has(id)) {
    store.delete(id);
    res.json({ message: 'Paste deleted' });
    return;
  }

  res.status(404).json({ error: 'Paste not found' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel available at http://localhost:${PORT}/admin.html`);
});
