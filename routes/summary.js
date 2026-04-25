const express = require('express');
const { generateEarthquakeSummary } = require('../services/aiService');

const router = express.Router();
const summaryCache = new Map();

router.post('/', async (req, res) => {
  try {
    const { id, mag, place, depth, time, lat, lng } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'Missing required field: id' });
    }

    if (summaryCache.has(id)) {
      return res.json({ summary: summaryCache.get(id), cached: true });
    }

    const summary = await generateEarthquakeSummary({
      mag: Number(mag),
      place: place || 'Unknown location',
      depth: Number(depth),
      time: Number(time),
      lat: Number(lat),
      lng: Number(lng)
    });

    summaryCache.set(id, summary);
    return res.json({ summary });
  } catch (error) {
    console.error('[summary] generate failed:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to generate summary',
      message: error?.message || 'unknown error'
    });
  }
});

module.exports = router;
