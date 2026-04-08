import express from 'express';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Store encrypted data and expiration times
const store = new Map();

app.use(express.static(__dirname));
app.use(express.json());

// Admin authentication middleware
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Store encrypted password
app.post('/api/share', (req, res) => {
  const { encrypted, expiresIn } = req.body;

  if (!encrypted) {
    return res.status(400).json({ error: 'No data provided' });
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
app.get('/api/share/:id', (req, res) => {
  const { id } = req.params;
  const data = store.get(id);

  if (!data) {
    return res.status(404).json({ error: 'Share not found or expired' });
  }

  if (Date.now() > data.expiresAt) {
    store.delete(id);
    return res.status(404).json({ error: 'Share expired' });
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
app.get('/api/admin/pastes', adminAuth, (req, res) => {
  const pastes = Array.from(store.entries()).map(([id, data]) => ({
    id,
    createdAt: new Date(data.expiresAt - (data.expiresIn || 0) * 1000).toISOString(),
    expiresAt: new Date(data.expiresAt).toISOString(),
    expiresIn: Math.ceil((data.expiresAt - Date.now()) / 1000),
    size: data.encrypted.ciphertext.length
  }));

  res.json({ total: pastes.length, pastes });
});

app.delete('/api/admin/pastes/:id', adminAuth, (req, res) => {
  const { id } = req.params;

  if (store.has(id)) {
    store.delete(id);
    return res.json({ message: 'Paste deleted' });
  }

  res.status(404).json({ error: 'Paste not found' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel available at http://localhost:${PORT}/admin.html`);
});
