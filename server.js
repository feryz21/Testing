const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// === PASTE KUNCI DARI JSONBIN DI SINI ===
const JSONBIN_BIN_ID = '6a83083af5f4af5e29204dde';
const JSONBIN_MASTER_KEY = '$2a$10$3ABHbhti5J9x5TwmMwixle2fNiNa3fIUVlpl7tC0LimQBFH4FDj4O';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get Gambar dari Cloud JSONbin
app.get('/api/image', async (req, res) => {
  try {
    const response = await axios.get(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
    });
    res.json({ imageUrl: response.data.record.imageUrl });
  } catch (err) {
    res.json({ imageUrl: 'https://picsum.photos/600/400' });
  }
});

// Upload Gambar (Ubah ke Base64 & Simpan Permanen ke JSONbin)
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Simpan ke JSONbin
    await axios.put(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, 
      { imageUrl: base64Image },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_MASTER_KEY
        }
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan gambar permanen' });
  }
});

app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
