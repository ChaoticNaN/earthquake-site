const express = require('express');

const router = express.Router();

function toValidDateString(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const threeYearsAgo = new Date(now);
    threeYearsAgo.setFullYear(now.getFullYear() - 3);

    const start = toValidDateString(req.query.start, threeYearsAgo.toISOString().slice(0, 10));
    const end = toValidDateString(req.query.end, now.toISOString().slice(0, 10));
    const minMag = toNumber(req.query.minMag, 5.5);
    const maxMag = toNumber(req.query.maxMag, Infinity);

    const usgsUrl = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
    usgsUrl.searchParams.set('format', 'geojson');
    usgsUrl.searchParams.set('starttime', start);
    usgsUrl.searchParams.set('endtime', end);
    usgsUrl.searchParams.set('minmagnitude', String(Math.max(0, minMag)));

    const response = await fetch(usgsUrl.toString());
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch data from USGS'
      });
    }

    const data = await response.json();
    const features = Array.isArray(data.features) ? data.features : [];
    const filtered = Number.isFinite(maxMag)
      ? features.filter((quake) => Number(quake?.properties?.mag) <= maxMag)
      : features;

    return res.json({
      ...data,
      features: filtered
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
