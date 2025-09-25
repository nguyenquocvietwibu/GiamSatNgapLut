require('dotenv').config();

const express = require('express');
const đường_dẫn = require('path');
const ứng_dụng = express();
const cổng = 3000;

// Cấu hình EJS
ứng_dụng.set('view engine', 'ejs');
ứng_dụng.set('views', đường_dẫn.join(__dirname, 'views'));

// Phục vụ file tĩnh
ứng_dụng.use(express.static(đường_dẫn.join(__dirname, 'public')));

// Route chính
ứng_dụng.get('/', (req, res) => {
  res.render('index');
});

// Route trả token cho client
ứng_dụng.get('/api/mapbox-token', (req, res) => {
  console.log(process.env.MAPBOX_TOKEN);
  res.json({ token: process.env.MAPBOX_TOKEN });
});

ứng_dụng.listen(cổng, () => {
  console.log(`Ứng dụng đang chạy tại http://localhost:${cổng}`);
});