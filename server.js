import express from 'express';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Store encrypted data and expiration times
const store = new Map();

app.use(express.static(__dirname));
app.use(express.json());

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
    expiresAt: expirationTime
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
