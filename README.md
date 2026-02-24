# 🎌 JKT48 IDN Live Tracker

Web app full-stack untuk memantau siapa saja member JKT48 yang sedang live di IDN secara real-time.

## Struktur Project

```
jkt48-live/
├── src/
│   └── index.js       ← Backend Express.js (CJS)
├── public/
│   └── index.html     ← Frontend (HTML + CSS + JS)
├── package.json
└── README.md
```

## Instalasi

```bash
# Install dependensi
npm install

# Jalankan server (production)
npm start

# Jalankan dengan auto-reload (development)
npm run dev
```

Server akan berjalan di **http://localhost:3000**

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/jkt48` | Daftar semua member yang sedang live |
| GET | `/api/jkt48/:username` | Status live member tertentu |
| GET | `/api/health` | Cek status server |

### Contoh Response `/api/jkt48`

```json
{
  "status": "ok",
  "total": 2,
  "updated_at": "2025-01-01T10:00:00.000Z",
  "data": [
    {
      "id": "abc123",
      "slug": "jkt48_freya",
      "title": "Good Morning Everyone!",
      "name": "Freya JKT48",
      "username": "jkt48_freya",
      "avatar": "https://...",
      "thumbnail": "https://...",
      "viewers": 1500,
      "is_live": true,
      "started_at": "2025-01-01T09:30:00.000Z",
      "idn_url": "https://idn.app/jkt48_freya"
    }
  ]
}
```

## Fitur

- ✅ Real-time data live member JKT48 dari IDN
- ✅ Auto-refresh setiap 60 detik
- ✅ Cache 30 detik di sisi server
- ✅ Fallback ke endpoint alternatif jika gagal
- ✅ Frontend responsif dengan desain modern
- ✅ Tampilkan thumbnail, nama, judul live, dan jumlah penonton
- ✅ Klik langsung ke halaman IDN Live member

## Lisensi

MIT License
