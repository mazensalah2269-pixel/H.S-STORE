import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with large payload limit for base64 uploads
  app.use(express.json({ limit: '20mb' }));

  // API Products Sync Endpoints (Server-side Database)
  const PRODUCTS_FILE = path.join(process.cwd(), 'products_db.json');

  app.get('/api/products', async (req, res) => {
    try {
      if (fs.existsSync(PRODUCTS_FILE)) {
        const data = await fs.promises.readFile(PRODUCTS_FILE, 'utf-8');
        return res.json(JSON.parse(data));
      }
      return res.json(null); // Return null if no DB file is present yet, so client can upload initial data
    } catch (error) {
      console.error('Error reading products DB:', error);
      res.status(500).json({ error: 'Failed to read products' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const { products } = req.body;
      if (!Array.isArray(products)) {
        return res.status(400).json({ error: 'Invalid products data structure' });
      }
      await fs.promises.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
      console.log('Successfully synchronized products database on the server.');
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving products DB:', error);
      res.status(500).json({ error: 'Failed to save products' });
    }
  });

  // API Upload Endpoint
  app.post('/api/upload', async (req, res) => {
    try {
      const { filename, base64 } = req.body;
      if (!filename || !base64) {
        return res.status(400).json({ error: 'Missing filename or base64 data' });
      }

      // Extract raw base64 data (strip data URI prefix if present)
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Sanitize the filename to prevent directory traversal
      const cleanFilename = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFilename = `${Date.now()}_${cleanFilename}`;

      const publicImagesDir = path.join(process.cwd(), 'public', 'images');
      
      // Ensure the directory exists
      if (!fs.existsSync(publicImagesDir)) {
        fs.mkdirSync(publicImagesDir, { recursive: true });
      }

      const filePath = path.join(publicImagesDir, uniqueFilename);
      await fs.promises.writeFile(filePath, buffer);

      console.log(`Successfully saved uploaded image to: ${filePath}`);
      res.json({ url: `/images/${uniqueFilename}` });
    } catch (error: any) {
      console.error('Error saving uploaded file:', error);
      res.status(500).json({ error: 'Failed to save uploaded file' });
    }
  });

  // Serve static files and handle SPA fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
