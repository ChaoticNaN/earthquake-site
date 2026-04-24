require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const earthquakesRouter = require('./routes/earthquakes');
const translateRouter = require('./routes/translate');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 统一 API 响应为 UTF-8 JSON（显式声明，避免环境差异）
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use('/api/earthquakes', earthquakesRouter);
app.use('/api/translate', translateRouter);

// 静态文本资源显式声明 UTF-8
app.use(
  express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.html') res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (ext === '.js') res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      if (ext === '.css') res.setHeader('Content-Type', 'text/css; charset=utf-8');
      if (ext === '.json') res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (ext === '.txt') res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      if (ext === '.svg') res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    }
  })
);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Earthquake server running at http://localhost:${PORT}`);
});
