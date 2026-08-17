const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi Database SQLite
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Gagal membuka database:', err.message);
  else console.log('Terhubung ke database SQLite.');
});

// Buat tabel jika belum ada dan isi data awal
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    image_url TEXT NOT NULL
  )`);

  db.run(`INSERT OR IGNORE INTO config (id, image_url) VALUES (1, 'https://picsum.photos/600/400')`);
});

// Endpoint API: Ambil URL gambar saat ini
app.get('/api/image', (req, res) => {
  db.get(`SELECT image_url FROM config WHERE id = 1`, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ imageUrl: row.image_url });
  });
});

// Endpoint API: Perbarui URL gambar (Halaman Admin)
app.post('/api/image', (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'URL Gambar wajib diisi' });

  db.run(`UPDATE config SET image_url = ? WHERE id = 1`, [imageUrl], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Gambar berhasil diperbarui!' });
  });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
