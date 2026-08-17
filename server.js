const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

// === KUNCI API ===
const IMGBB_API_KEY = 'f95d0987d63323c055ddbece91a1470e';
const JSONBIN_BIN_ID = '6a83083af5f4af5e29204dde';
const JSONBIN_MASTER_KEY = '$2a$10$0kmCVoz2YzmrWjIHzOhaBuTmadAkcG6rpEJGATIxHnZ1chFV/hodO';

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Endpoint Proxy Gambar (HP Pengguna Panggil Ini)
app.get('/api/view-image', async (req, res) => {
  try {
    // Ambil URL ImgBB dari JSONbin
    const jsonbinRes = await axios.get(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
    });

    let imageUrl = jsonbinRes.data.record.imageUrl;
    if (!imageUrl) {
      return res.redirect('https://picsum.photos/600/400');
    }

    // Ambil file gambar langsung dari server ImgBB
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    // Set header tipe konten sesuai gambar asli (image/jpeg, image/png)
    res.set('Content-Type', imageResponse.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Kirim stream/buffer gambar ke HP pengguna
    res.send(Buffer.from(imageResponse.data, 'binary'));
  } catch (err) {
    console.error('Gagal mengambil gambar via proxy:', err.message);
    res.redirect('https://picsum.photos/600/400');
  }
});

// 2. Upload Gambar ke ImgBB & Simpan URL ke JSONbin
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

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

    // Simpan ke JSONbin
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

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengunggah gambar' });
  }
});

app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
