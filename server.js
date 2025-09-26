require('dotenv').config();

const express = require('express');
const phiên = require('express-session');
const đường_dẫn = require('path');
const ứng_dụng = express();
const csdl_hợp_nhất = require('./database'); // kết nối PostgreSQL


// Cấu hình EJS
ứng_dụng.set('view engine', 'ejs');
ứng_dụng.set('views', đường_dẫn.join(__dirname, 'views'));

// Phục vụ file tĩnh
ứng_dụng.use(express.static(đường_dẫn.join(__dirname, 'public')));

// Phân tích xử lý dữ liệu gửi từ client về khi submit form
ứng_dụng.use(express.urlencoded({ extended: true }));

// Phân tích xử lý dự liệu gửi từ client là json
ứng_dụng.use(express.json());

// Khai báo middleware session
ứng_dụng.use(phiên({
  secret: process.env.EP_SECRET_CODE, // đổi thành chuỗi bí mật của bạn
  resave: false,
  saveUninitialized: true
}));

ứng_dụng.use((req, res, next) => {
  // Nếu chưa có biến trong session thì tạo mặc định
  if (typeof req.session.quyền_quản_trị === "undefined") {
    req.session.quyền_quản_trị = false; // mặc định là false
  }
  if (typeof req.session.tên_người_dùng === "undefined") {
    req.session.tên_người_dùng = "";
  }
  next();
});



// Route chính
ứng_dụng.get('/', (req, res) => {
  console.log(req.session.quyền_quản_trị);
  if (req.session.tên_người_dùng != "") {
    console.log(req.session.tên_người_dùng);
  }
  else {
    console.log("không rõ");
  }
  res.render('index', { quyền_quản_trị: req.session.quyền_quản_trị, tên_người_dùng: req.session.tên_người_dùng});
});

// Route đăng nhập
ứng_dụng.get('/dang-nhap', (req, res) => {
  res.render('login');
});

ứng_dụng.post('/dang-nhap', async (req, res) => {
  const { "tài-khoản": tài_khoản, "mật-khẩu": mật_khẩu } = req.body;

  try {
    const kết_quả_truy_vấn = await csdl_hợp_nhất.query(
      "SELECT * FROM nguoi_dung WHERE tai_khoan = $1 AND mat_khau = crypt($2, mat_khau);",
      [tài_khoản, mật_khẩu]
    );

    if (kết_quả_truy_vấn.rows.length > 0) {
      req.session.quyền_quản_trị = kết_quả_truy_vấn.rows[0].quyen_quan_tri;
      req.session.tên_người_dùng = kết_quả_truy_vấn.rows[0].ten;
      return res.redirect('/');
    } else {
      // Truyền biến lỗi cho view
      return res.render('login', { lỗi: "Sai tài khoản hoặc mật khẩu!" });
    }
  } catch (error) {
    console.log("không thể truy vấn đăng nhập: ", error);
  }
});

// Route đăng nhập
ứng_dụng.get('/dang-xuat', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Api trả mapbox token cho client
ứng_dụng.get('/api/lay-mapbox-token', (req, res) => {
  res.json({ token: process.env.MAPBOX_TOKEN });
});

// Khởi động server
ứng_dụng.listen(process.env.SV_PORT, () => {
  console.log(`Ứng dụng đang chạy tại http://localhost:${process.env.SV_PORT}`);
});