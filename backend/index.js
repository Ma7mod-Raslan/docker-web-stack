const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const promClient = require('prom-client');

// Collect default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics();

// Custom metrics
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status']
});

const app = express();
app.use(cors());

// Middleware to track requests
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });
    end({ method: req.method, route: req.path, status: res.statusCode });
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpass',
  database: process.env.DB_NAME || 'tododb',
};

async function getDB() {
  return mysql.createConnection(dbConfig);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

// Get all todos
app.get('/api/todos', async (req, res) => {
  try {
    const conn = await getDB();
    const [rows] = await conn.execute('SELECT * FROM todos ORDER BY created_at DESC');
    await conn.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create todo
app.post('/api/todos', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    const conn = await getDB();
    const [result] = await conn.execute('INSERT INTO todos (title) VALUES (?)', [title]);
    const [rows] = await conn.execute('SELECT * FROM todos WHERE id = ?', [result.insertId]);
    await conn.end();
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle todo
app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await getDB();
    await conn.execute('UPDATE todos SET done = NOT done WHERE id = ?', [id]);
    const [rows] = await conn.execute('SELECT * FROM todos WHERE id = ?', [id]);
    await conn.end();
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete todo
app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await getDB();
    await conn.execute('DELETE FROM todos WHERE id = ?', [id]);
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Backend running on port 3000'));