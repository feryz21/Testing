const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

// === MASUKKAN API KEY IMGBB KAMU DI SINI ===
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || 'f95d0987d63323c055ddbece91a1470e';

// Multer menggunakan RAM (Memory Storage) untuk sementara sebelum dikirim ke ImgBB
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi Database SQLite
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Gagal membuka database:', err.message);
  else console.log('Terhubung ke database SQLite.');
});

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

// Endpoint API: Upload gambar langsung dari HP ke ImgBB
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file diupload' });

    // Kirim gambar ke ImgBB
    const formData = new FormData();
    formData.append('image', req.file.buffer.toString('base64'));

    const imgbbResponse = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      formData,
      { headers: formData.getHeaders() }
    );

    const directImageUrl = imgbbResponse.data.data.url;

    // Simpan link gambar permanen ke SQLite
    db.run(`UPDATE config SET image_url = ? WHERE id = 1`, [directImageUrl], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, imageUrl: directImageUrl, message: 'Gambar berhasil di-upload secara permanen!' });
    });

  } catch (error) {
    console.error('Error Upload:', error.message);
    res.status(500).json({ error: 'Gagal mengunggah gambar ke ImgBB.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
