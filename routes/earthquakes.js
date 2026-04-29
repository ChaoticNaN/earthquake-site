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

function formatDateOnly(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
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

router.get('/calendar', async (req, res) => {
  try {
    const now = new Date();
    const defaultEnd = formatDateOnly(now);
    const defaultStart = formatDateOnly(addDays(now, -364));
    const start = toValidDateString(req.query.start, defaultStart);
    const end = toValidDateString(req.query.end, defaultEnd);

    if (new Date(start) > new Date(end)) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'start date cannot be later than end date'
      });
    }

    const usgsUrl = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
    usgsUrl.searchParams.set('format', 'geojson');
    usgsUrl.searchParams.set('starttime', `${start}T00:00:00`);
    usgsUrl.searchParams.set('endtime', `${end}T23:59:59`);
    usgsUrl.searchParams.set('minmagnitude', '4');

    const response = await fetchUsgs(usgsUrl.toString());
    if (!response.ok) {
      return res.status(502).json({
        error: 'Failed to fetch data from USGS',
        message: `USGS upstream status: ${response.status}`
      });
    }

    const data = await response.json();
    const features = Array.isArray(data.features) ? data.features : [];
    const dailyStats = new Map();

    for (const quake of features) {
      const timestamp = Number(quake?.properties?.time);
      const mag = Number(quake?.properties?.mag);
      if (!Number.isFinite(timestamp) || !Number.isFinite(mag)) continue;
      const dateKey = formatDateOnly(timestamp);
      const current = dailyStats.get(dateKey) || { maxMag: null, countAbove4: 0 };
      current.maxMag = current.maxMag === null ? mag : Math.max(current.maxMag, mag);
      if (mag >= 5) current.countAbove4 += 1;
      dailyStats.set(dateKey, current);
    }

    const result = [];
    for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d = addDays(d, 1)) {
      const key = formatDateOnly(d);
      const stat = dailyStats.get(key) || { maxMag: null, countAbove4: 0 };
      result.push({
        date: key,
        maxMag: stat.maxMag === null ? null : Number(stat.maxMag.toFixed(2)),
        countAbove4: stat.countAbove4
      });
    }

    return res.json(result);
  } catch (error) {
    return res.status(502).json({
      error: 'Upstream request failed',
      message: getFetchErrorMessage(error)
    });
  }
});

module.exports = router;
