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

function formatDateInBeijing(input) {
  const date = input instanceof Date ? input : new Date(input);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getYearRange(year) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`
  };
}

function getBeijingDayUtcRange(dateText) {
  const startUtcMs = Date.parse(`${dateText}T00:00:00+08:00`);
  const endUtcMs = Date.parse(`${dateText}T23:59:59+08:00`);
  return {
    start: new Date(startUtcMs).toISOString(),
    end: new Date(endUtcMs).toISOString()
  };
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

const calendarStatsCache = new Map();
const CALENDAR_STATS_CACHE_TTL_MS = 60 * 60 * 1000;

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = addDays(now, -29);

    const start = toValidDateString(req.query.start, formatDateOnly(thirtyDaysAgo));
    const end = toValidDateString(req.query.end, now.toISOString().slice(0, 10));
    const minMag = toNumber(req.query.minMag, 5.5);
    const maxMag = toNumber(req.query.maxMag, Infinity);
    const limitRaw = toNumber(req.query.limit, 100);
    const limit = Math.max(1, Math.min(2000, Math.floor(limitRaw)));
    const tz = String(req.query.tz || '').trim();

    if (new Date(start) > new Date(end)) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'start date cannot be later than end date'
      });
    }

    const usgsUrl = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
    usgsUrl.searchParams.set('format', 'geojson');
    if (tz === 'Asia/Shanghai') {
      usgsUrl.searchParams.set('starttime', getBeijingDayUtcRange(start).start);
      usgsUrl.searchParams.set('endtime', getBeijingDayUtcRange(end).end);
    } else {
      usgsUrl.searchParams.set('starttime', start);
      usgsUrl.searchParams.set('endtime', end);
    }
    usgsUrl.searchParams.set('minmagnitude', String(Math.max(0, minMag)));
    if (Number.isFinite(maxMag)) {
      usgsUrl.searchParams.set('maxmagnitude', String(Math.max(0, maxMag)));
    }
    usgsUrl.searchParams.set('orderby', 'time');
    usgsUrl.searchParams.set('limit', String(limit));

    const response = await fetchUsgs(usgsUrl.toString());
    if (!response.ok) {
      return res.status(502).json({
        error: 'Failed to fetch data from USGS',
        message: `USGS upstream status: ${response.status}`
      });
    }

    const data = await response.json();
    const filtered = Array.isArray(data.features) ? data.features : [];

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

router.get('/calendar-stats', async (req, res) => {
  try {
    const requestedYear = Number(req.query.year);
    const currentYear = new Date().getUTCFullYear();
    const year = Number.isInteger(requestedYear) ? requestedYear : currentYear;
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({
        error: 'Invalid year',
        message: 'year must be a 4-digit number'
      });
    }

    const cacheKey = String(year);
    const cached = calendarStatsCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CALENDAR_STATS_CACHE_TTL_MS) {
      return res.json(cached.payload);
    }

    const { start, end } = getYearRange(year);
    const yearStartUtc = getBeijingDayUtcRange(start).start;
    const yearEndUtc = getBeijingDayUtcRange(end).end;
    const usgsUrl = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
    usgsUrl.searchParams.set('format', 'geojson');
    usgsUrl.searchParams.set('starttime', yearStartUtc);
    usgsUrl.searchParams.set('endtime', yearEndUtc);
    usgsUrl.searchParams.set('minmagnitude', '5');
    usgsUrl.searchParams.set('orderby', 'time');
    usgsUrl.searchParams.set('limit', '20000');

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
      const dateKey = formatDateInBeijing(timestamp);
      const current = dailyStats.get(dateKey) || { maxMag: null, count: 0 };
      current.maxMag = current.maxMag === null ? mag : Math.max(current.maxMag, mag);
      if (mag >= 5) current.count += 1;
      dailyStats.set(dateKey, current);
    }

    const stats = [];
    for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d = addDays(d, 1)) {
      const key = formatDateOnly(d);
      const stat = dailyStats.get(key) || { maxMag: null, count: 0 };
      stats.push({
        date: key,
        maxMag: stat.maxMag === null ? null : Number(stat.maxMag.toFixed(2)),
        count: stat.count
      });
    }

    const payload = { year, stats };
    calendarStatsCache.set(cacheKey, { cachedAt: Date.now(), payload });
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({
      error: 'Upstream request failed',
      message: getFetchErrorMessage(error)
    });
  }
});

module.exports = router;
