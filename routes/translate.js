const express = require('express');

const router = express.Router();
const fetchImpl =
  typeof global.fetch === 'function'
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function normalizeCity(cityValue) {
  if (Array.isArray(cityValue)) return cityValue[0] || '';
  return cityValue || '';
}

function buildChinesePlace(addressComponent = {}) {
  const province = (addressComponent.province || '').trim();
  const city = normalizeCity(addressComponent.city).trim();
  const district = (addressComponent.district || '').trim();
  const parts = [province, city, district]
    .filter((part) => part)
    .filter((part, index, arr) => arr.indexOf(part) === index);
  return parts.join(' ');
}

function buildBestPlace(regeocode = {}, originalPlace = '') {
  const byComponent = buildChinesePlace(regeocode.addressComponent || {});
  if (byComponent) return byComponent;

  const formatted = (regeocode.formatted_address || '').trim();
  if (formatted) return formatted;

  return originalPlace || '';
}

router.post('/', async (req, res) => {
  try {
    const { lat, lng, originalPlace } = req.body || {};
    const amapKey = process.env.AMAP_KEY;

    if (!amapKey) {
      return res.json({ translatedPlace: originalPlace || '' });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.json({ translatedPlace: originalPlace || '' });
    }

    const amapUrl = new URL('https://restapi.amap.com/v3/geocode/regeo');
    amapUrl.searchParams.set('location', `${lngNum},${latNum}`);
    amapUrl.searchParams.set('key', amapKey);
    amapUrl.searchParams.set('extensions', 'all');

    const response = await fetchImpl(amapUrl.toString());
    if (!response.ok) {
      console.warn(`[translate] AMap HTTP error: ${response.status}`);
      return res.json({ translatedPlace: originalPlace || '' });
    }

    const data = await response.json();
    if (data.status !== '1') {
      console.warn(
        `[translate] AMap API error: infocode=${data.infocode || ''}, info=${data.info || ''}`
      );
      return res.json({ translatedPlace: originalPlace || '' });
    }

    const translatedPlace = buildBestPlace(data.regeocode || {}, originalPlace);
    return res.json({ translatedPlace });
  } catch (error) {
    console.warn(`[translate] unexpected error: ${error?.message || error}`);
    return res.json({ translatedPlace: req.body?.originalPlace || '' });
  }
});

module.exports = router;
