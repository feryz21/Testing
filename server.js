const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// === PASTE KUNCI DARI JSONBIN DI SINI ===
const JSONBIN_BIN_ID = '6a83083af5f4af5e29204dde';
const JSONBIN_MASTER_KEY = '$2a$10$0kmCVoz2YzmrWjIHzOhaBuTmadAkcG6rpEJGATIxHnZ1chFV/hodO';

// Gunakan memoryStorage dengan batas file maksimal 3 MB agar muat di JSONbin
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 1. Endpoint untuk Menampilkan Gambar (Proxy Base64 dari JSONbin)
app.get('/api/view-image', async (req, res) => {
  try {
    const jsonbinRes = await axios.get(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY },
      timeout: 8000
    });

    const imageDataUri = jsonbinRes.data.record.imageUrl;

    if (!imageDataUri || !imageDataUri.startsWith('data:image')) {
      // Jika data kosong, tampilkan gambar transparan kecil, bukan gambar acak
      return res.status(404).send('Gambar belum diupload');
    }

    // Parsing data Base64
    const matches = imageDataUri.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).send('Format gambar salah');
    }

    const contentType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(imageBuffer);

  } catch (err) {
    console.error('Error saat membaca gambar dari JSONbin:', err.response ? err.response.data : err.message);
    res.status(500).send('Gagal mengambil gambar');
  }
});

// 2. Endpoint Upload Gambar (Ubah Gambar ke Base64 & Simpan ke JSONbin)
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

    // Ubah buffer foto ke format Base64 Data URI
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Simpan data gambar Base64 ke JSONbin
    await axios.put(
      `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`,
      { imageUrl: base64Image },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_MASTER_KEY
        },
        timeout: 10000
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error saat upload ke JSONbin:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Gagal menyimpan gambar ke database.' });
  }
});

app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
