'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve static frontend dari folder public
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── IDN Live API Base ────────────────────────────────────────
// IDN Live menggunakan GraphQL / endpoint tidak resmi yang bisa diakses publik
const IDN_API_BASE = 'https://mobile.idn.app';
const IDN_HEADERS = {
  'User-Agent': 'okhttp/4.9.0',
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Client-ID': 'idn-android',
};

// ─── Cache sederhana ─────────────────────────────────────────
let cache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 30 * 1000; // 30 detik

// ─── Helper: Ambil data live IDN JKT48 ───────────────────────
async function fetchIdnLive() {
  // Cek cache dulu
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    console.log('[Cache] Menggunakan data cache');
    return cache.data;
  }

  try {
    // Endpoint IDN Live – daftar livestream aktif
    const response = await axios.get(`${IDN_API_BASE}/v1/lives`, {
      headers: IDN_HEADERS,
      params: {
        username: 'jkt48',
        limit: 50,
      },
      timeout: 10000,
    });

    let lives = [];

    if (response.data && response.data.data) {
      lives = response.data.data;
    } else if (Array.isArray(response.data)) {
      lives = response.data;
    }

    // Filter hanya JKT48
    const jkt48Lives = lives.filter((live) => {
      const username = (live.user?.username || live.username || '').toLowerCase();
      const name = (live.user?.name || live.name || '').toLowerCase();
      return username.includes('jkt48') || name.includes('jkt48');
    });

    const result = {
      status: 'ok',
      total: jkt48Lives.length,
      updated_at: new Date().toISOString(),
      data: jkt48Lives.map((live) => formatLive(live)),
    };

    // Simpan ke cache
    cache.data = result;
    cache.timestamp = Date.now();

    return result;
  } catch (err) {
    // Fallback: coba endpoint alternatif
    console.warn('[Fallback] Endpoint utama gagal, mencoba alternatif...');
    return await fetchIdnLiveFallback();
  }
}

// ─── Fallback: Endpoint alternatif ───────────────────────────
async function fetchIdnLiveFallback() {
  try {
    // Coba endpoint pencarian live per username JKT48 member
    const jkt48Usernames = [
      'jkt48_freya', 'jkt48_shani', 'jkt48_adel', 'jkt48_christy',
      'jkt48_oline', 'jkt48_zee', 'jkt48_beby', 'jkt48_gita',
      'jkt48_marsha', 'jkt48_muthe', 'jkt48_raisha', 'jkt48_gracia',
      'jkt48_lana', 'jkt48_acha', 'jkt48_dena', 'jkt48_thalia',
      'jkt48_feni', 'jkt48_intan', 'jkt48_cinta',
    ];

    const liveResults = [];

    // Ambil sample beberapa username secara paralel
    const promises = jkt48Usernames.slice(0, 5).map((username) =>
      axios
        .get(`${IDN_API_BASE}/v1/lives`, {
          headers: IDN_HEADERS,
          params: { username, limit: 1 },
          timeout: 6000,
        })
        .catch(() => null)
    );

    const responses = await Promise.all(promises);

    responses.forEach((res) => {
      if (res && res.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.data || [];
        items.forEach((live) => {
          if (live && (live.status === 'live' || live.is_live)) {
            liveResults.push(formatLive(live));
          }
        });
      }
    });

    const result = {
      status: 'ok',
      total: liveResults.length,
      updated_at: new Date().toISOString(),
      data: liveResults,
    };

    cache.data = result;
    cache.timestamp = Date.now();

    return result;
  } catch (err) {
    throw new Error('Semua endpoint gagal: ' + err.message);
  }
}

// ─── Format data live ─────────────────────────────────────────
function formatLive(live) {
  return {
    id: live.id || live.slug || null,
    slug: live.slug || null,
    title: live.live_title || live.title || 'IDN Live',
    name: live.user?.name || live.name || 'JKT48 Member',
    username: live.user?.username || live.username || '',
    avatar: live.user?.avatar || live.avatar || null,
    thumbnail: live.image || live.live_image || live.thumbnail || live.cover_url || null,
    viewers: live.view_count || live.total_watch || live.viewers || 0,
    is_live: live.is_live !== undefined ? live.is_live : true,
    started_at: live.live_at || live.created_at || live.start_time || null,
    idn_url: live.user?.username
      ? `https://idn.app/${live.user.username}`
      : live.username
      ? `https://idn.app/${live.username}`
      : 'https://idn.app',
  };
}

// ─── Routes ──────────────────────────────────────────────────

// GET /api/jkt48 — semua live JKT48
app.get('/api/jkt48', async (req, res) => {
  try {
    const data = await fetchIdnLive();
    res.json(data);
  } catch (err) {
    console.error('[Error] /api/jkt48:', err.message);
    res.status(500).json({
      status: 'error',
      message: err.message,
      data: [],
    });
  }
});

// GET /api/jkt48/:username — live satu member tertentu
app.get('/api/jkt48/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const response = await axios.get(`${IDN_API_BASE}/v1/lives`, {
      headers: IDN_HEADERS,
      params: { username, limit: 1 },
      timeout: 10000,
    });

    const items = Array.isArray(response.data) ? response.data : response.data?.data || [];
    const live = items[0] ? formatLive(items[0]) : null;

    res.json({
      status: 'ok',
      data: live,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/health — cek status server
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'JKT48 IDN Live API',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()) + 's',
    timestamp: new Date().toISOString(),
  });
});

// Semua route lain → kirim frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   🎌 JKT48 IDN Live Tracker API      ║');
  console.log(`  ║   Running at http://localhost:${PORT}   ║`);
  console.log('  ║   GET /api/jkt48  → Live data        ║');
  console.log('  ║   GET /api/health → Status server    ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
