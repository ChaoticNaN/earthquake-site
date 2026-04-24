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

app.use('/api/earthquakes', earthquakesRouter);
app.use('/api/translate', translateRouter);

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Earthquake server running at http://localhost:${PORT}`);
});
