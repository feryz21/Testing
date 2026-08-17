const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

// === KUNCI API (Ganti dengan milikmu) ===
const IMGBB_API_KEY = 'f95d0987d63323c055ddbece91a1470e';
const JSONBIN_BIN_ID = '6a83083af5f4af5e29204dde';
const JSONBIN_MASTER_KEY = '$2a$10$3ABHbhti5J9x5TwmMwixle2fNiNa3fIUVlpl7tC0LimQBFH4FDj4O';

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get Gambar
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

// Upload Gambar (ImgBB -> simpan URL ke JSONbin)
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File tidak ada' });

    // 1. Upload ke ImgBB
    const formData = new FormData();
    formData.append('image', req.file.buffer.toString('base64'));

    const imgbbRes = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      formData,
      { headers: formData.getHeaders() }
    );

    let imageUrl = imgbbRes.data.data.url;
    if (imageUrl.startsWith('http://')) {
      imageUrl = imageUrl.replace('http://', 'https://');
    }

    // 2. Simpan Link Gambar ke JSONbin
    await axios.put(
      `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`,
      { imageUrl: imageUrl },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_MASTER_KEY
        }
      }
    );

    res.json({ success: true, imageUrl });

  } catch (err) {
    console.error('Error detail:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Gagal mengunggah atau menyimpan gambar.' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
