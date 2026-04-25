const express = require('express');
const https = require('https');

const router = express.Router();
const fetchImpl =
  typeof global.fetch === 'function'
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const fetchNode =
  typeof global.fetch === 'function'
    ? (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))
    : null;

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

function getFetchErrorMessage(error) {
  const base = error?.message || String(error);
  const causeCode = error?.cause?.code || '';
  if (causeCode) return `${base} (${causeCode})`;
  return base;
}

async function fetchUsgs(url) {
  const timeoutMs = 12000;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, {
      signal: controller.signal
    });
  } catch (firstError) {
    if (!fetchNode) throw firstError;

    const agent = new https.Agent({ family: 4 });
    return fetchNode(url, {
      timeout: timeoutMs,
      agent
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
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

    const response = await fetchUsgs(usgsUrl.toString());
    if (!response.ok) {
      return res.status(502).json({
        error: 'Failed to fetch data from USGS',
        message: `USGS upstream status: ${response.status}`
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
    return res.status(502).json({
      error: 'Upstream request failed',
      message: getFetchErrorMessage(error)
    });
  }
});

module.exports = router;
