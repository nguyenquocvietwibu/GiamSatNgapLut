require('dotenv').config();

const fs = require('fs').promises;
const fileUpload = require('express-fileupload');

const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const pooled_db = require('./database'); // kết nối PostgreSQL
const layouts = require('express-ejs-layouts');
const { error } = require('console');
const { features } = require('process');

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // đường dẫn tuyệt đối
app.set('layout', 'index');

app.use(fileUpload());
// Phục vụ file tĩnh với đường dẫn tuyệt đối
app.use(express.static(path.join(__dirname, 'public')));

// Phân tích xử lý dữ liệu gửi từ client về khi submit form
app.use(express.urlencoded({ extended: true }));

// Phân tích xử lý dự liệu gửi từ client là json
app.use(express.json());

app.use(layouts);

// Khai báo middleware session
app.use(session({
    secret: process.env.EP_SECRET_CODE, // đổi thành chuỗi bí mật của bạn
    resave: false, // không lưu lại nếu không thay đổi
    saveUninitialized: false // không lưu session giá trị rỗng;
}));

app.use((req, res, next) => {
    // Nếu chưa có biến trong session thì tạo mặc định
    // if (typeof req.session.vai_trò_người_dùng === "undefined") {
    //     req.session.vai_trò_người_dùng = "khách"; // mặc định là false
    // }
    if (typeof req.session.user_name === "undefined") {
        req.session.user_name = "";
    }
    next(); // gọi khi không có sử dụng res nếu không ứng dụng sẽ kẹt tại đây
});



// Hàm thêm file vào thư mục img
async function addToIMGFolder(file) {
    const imgFolderPath = path.join(__dirname, 'public', 'img');
    await fs.mkdir(imgFolderPath, { recursive: true });

    const fileName = `img_${Date.now()}${path.extname(file.name)}`;
    const filePath = path.join(imgFolderPath, fileName);

    await file.mv(filePath); // Dùng file.mv() của express-fileupload
    return fileName;
}

// Hàm xóa file từ thư mục img
async function deleteFromIMGFolder(fileName) {
    try {
        const filePath = path.join(__dirname, 'public', 'img', fileName);

        // Kiểm tra file có tồn tại không
        try {
            await fs.access(filePath);
        } catch {
            console.log('File không tồn tại:', fileName);
            return true; // Coi như đã xóa thành công
        }

        // Xóa file
        await fs.unlink(filePath);
        console.log('Đã xóa file:', fileName);
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa file từ thư mục img:', error);
        throw error;
    }
}

// Route chính
app.get('/', (req, res) => {
    res.render('user/home', { title: "Giám sát ngập lụt", user_name: req.session.user_name });
});

// Route chính
app.get('/admin', (req, res) => {
    res.render('admin/home', { title: "Quản trị giám sát ngập lụt", user_name: req.session.user_name });
});

// Route đăng nhập
app.get('/login', (req, res) => {
    res.render('login', { title: "Đăng nhập" });
});

app.post('/login', async (req, res) => {
    const { "account": account, "password": password } = req.body;

    try {
        const result = await pooled_db.query(
            "SELECT * FROM nguoi_dung WHERE tai_khoan = $1 AND mat_khau = crypt($2, mat_khau);",
            [account, password]
        );

        if (result.rows.length > 0) {
            const vai_trò_người_dùng = result.rows[0].vai_tro;
            req.session.user_name = result.rows[0].ten;
            if (vai_trò_người_dùng == "quản trị") {
                return res.redirect('/admin');
            }
            else return res.redirect('/');
        } else {
            return res.render('login', { title: "Đăng nhập", error_message: "Sai tài khoản hoặc mật khẩu" });
        }
    } catch (error) {
        console.log("không thể truy vấn đăng nhập: ", error);
    }
});

// Route đăng nhập
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Api trả mapbox token cho client
app.get('/api/get-mapbox-token', (req, res) => {
    try {
        if (process.env.MAPBOX_TOKEN) {
            res.status(200).json({
                mapbox_token: process.env.MAPBOX_TOKEN,
                success: true,
            });
        }
        else {
            throw new Error('MAPBOX_TOKEN không được cấu hình trong môi trường');
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        })
    }

});

// Route: Lấy tất cả không gian ngập dưới dạng GeoJSON FeatureCollection
app.get("/api/get-noi-ngap", async (req, res) => {
    try {
        const result = await pooled_db.query(`
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(hinh_dang)::json,
            'properties', json_build_object(
              'ma', ma,
              'ten', ten,
              'muc_nuoc_ngap', muc_nuoc_ngap,
              'loai_khong_gian', loai_khong_gian
            )
          ) ORDER BY ma desc
        )
      ) AS geojson 
      FROM noi_ngap;
    `);
        res.status(200).json({
            noiNgap: result.rows[0].geojson,
            success: true,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message  // ✅ Chỉ gửi message, không gửi cả object
        });
    }
});



app.post('/api/add-noi-ngap', async (req, res) => {

    const { floodName, floodDepth, floodType, floodGeometry } = req.body;

    try {
        const query = `
            INSERT INTO noi_ngap (ten, muc_nuoc_ngap, loai_khong_gian, hinh_dang) VALUES
            ($1, $2, $3, ST_GeomFromGeoJSON($4))
        `;
        await pooled_db.query(
            query,
            [
                floodName,
                floodDepth,
                floodType,
                floodGeometry
            ]
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/edit-noi-ngap', async (req, res) => {
    try {
        // CÁCH VIẾT fNÀY:
        const { floodId, floodName, floodDepth, floodType, floodGeometry } = req.body;

        // TƯƠNG ĐƯƠNG VỚI:
        // const floodId = req.body.floodId;
        // const floodName = req.body.floodName;
        // const floodDepth = req.body.floodDepth;
        // const floodType = req.body.floodType;
        // const floodGemetry = req.body.floodGemetry;
        const query = `
            UPDATE noi_ngap
            SET 
                ten = $1,
                muc_nuoc_ngap = $2,
                loai_khong_gian = $3,
                hinh_dang = ST_GeomFromGeoJSON($4)
            WHERE ma = $5
        `;
        await pooled_db.query(
            query,
            [
                floodName,
                floodDepth,
                floodType,
                floodGeometry,
                floodId
            ]
        );

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete("/api/delete-noi-ngap/:maMuonXoa", async (req, res) => {
    const maMuonXoa = req.params.maMuonXoa;
    try {
        await pooled_db.query("DELETE FROM noi_ngap WHERE ma = $1", [maMuonXoa]);
        res.status(200).json({ success: true }); // <--- quan trọng, gửi phản hồi
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/get-bao-cao-ngap-tu-dan', async (req, res) => {
    try {
        const query = `
            SELECT 
                ma, 
                ten_nguoi_gui, 
                ten_noi_ngap,
                so_dien_thoai_nguoi_gui, 
                muc_nuoc_ngap,
                loai_khong_gian, 
                ngay_tao,
                ST_AsGeoJSON(hinh_dang_ngap) as geometry
            FROM bao_cao_ngap_tu_dan 
            ORDER BY ma DESC
        `;
        const result = await pooled_db.query(query);
        res.status(200).json({
            baoCaoNgapTuDan: result.rows,
            success: true
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/get-anh-ngap-tu-dan-bao-cao', async (req, res) => {
    try {
        const maBaoCaoNgapTuDan = req.query.maBaoCaoNgapTuDan; // Lấy từ query string

        if (maBaoCaoNgapTuDan) {
            const query = `
                SELECT ma, ten 
                FROM anh_ngap_tu_dan_bao_cao 
                WHERE ma_bao_cao_ngap_tu_dan = $1
                ORDER BY ma desc
            `;
            const result = await pooled_db.query(query, [maBaoCaoNgapTuDan]);
            return res.status(200).json({
                anhNgapTuDanBaoCao: result.rows,
                success: true
            });
        } else {
            const result = await pooled_db.query("SELECT * FROM anh_ngap_tu_dan_bao_cao");
            return res.status(200).json({
                anhNgapTuDanBaoCao: result.rows,
                success: true
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Hàm xóa báo cáo và ảnh (có thể tách ra file riêng)
async function deleteUserReportFloodAndImage(maBaoCao) {
    // 1. Lấy danh sách tên ảnh từ database trước khi xóa
    const anhResult = await pooled_db.query(
        "SELECT ten FROM anh_ngap_tu_dan_bao_cao WHERE ma_bao_cao_ngap_tu_dan = $1",
        [maBaoCao]
    );

    // 2. Xóa các file ảnh từ thư mục img
    if (anhResult.rows.length > 0) {
        for (const anh of anhResult.rows) {
            try {
                await deleteFromIMGFolder(anh.ten);
            } catch (deleteError) {
                console.error(`Lỗi khi xóa file ${anh.ten}:`, deleteError);
            }
        }
    }

    // 3. Xóa trong database
    await pooled_db.query(
        "DELETE FROM anh_ngap_tu_dan_bao_cao WHERE ma_bao_cao_ngap_tu_dan = $1",
        [maBaoCao]
    );

    await pooled_db.query("DELETE FROM bao_cao_ngap_tu_dan WHERE ma = $1", [maBaoCao]);
}

// Route duyệt báo cáo
app.post('/api/aprove-bao-cao-ngap-tu-dan', async (req, res) => {
    try {
        const feature = req.body.feature;

        // Thêm vào bảng noi_ngap
        await pooled_db.query(`
            INSERT INTO noi_ngap (ten, muc_nuoc_ngap, loai_khong_gian, hinh_dang)
            VALUES ($1, $2, $3, ST_GeomFromGeoJSON($4))`,
            [feature.properties.ten_noi_ngap, feature.properties.muc_nuoc_ngap, feature.properties.loai_khong_gian, feature.geometry]
        );

        // Gọi hàm xóa báo cáo và ảnh
        await deleteUserReportFloodAndImage(feature.properties.ma);

        res.json({ success: true });

    } catch (error) {
        console.error('❌ Lỗi server khi duyệt báo cáo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route từ chối/xóa báo cáo
app.delete("/api/delete-bao-cao-ngap-tu-dan/:maMuonXoa", async (req, res) => {
    const maMuonXoa = req.params.maMuonXoa;
    try {
        // Chỉ cần gọi hàm xóa
        await deleteUserReportFloodAndImage(maMuonXoa);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/add-bao-cao-ngap-tu-dan', async (req, res) => {
    try {
        console.log("📨 Nhận dữ liệu từ client:");
        console.log("Body:", req.body);
        console.log("Files:", req.files);
        
        const { senderName, senderPhoneNumber, floodName, floodDepth, floodType, floodGeometry } = req.body;
        
        // 1. Thêm vào bảng bao_cao_ngap_tu_dan
        const result = await pooled_db.query(`
            INSERT INTO bao_cao_ngap_tu_dan 
            (ten_nguoi_gui, so_dien_thoai_nguoi_gui, ten_noi_ngap, muc_nuoc_ngap, loai_khong_gian, hinh_dang_ngap)
            VALUES ($1, $2, $3, $4, $5, ST_GeomFromGeoJSON($6))
            RETURNING ma
        `, [senderName, senderPhoneNumber, floodName, floodDepth, floodType, floodGeometry]);
        
        const maBaoCao = result.rows[0].ma;
        console.log("✅ Đã thêm báo cáo, mã:", maBaoCao);
        
        // 2. Xử lý ảnh nếu có
        if (req.files && req.files.floodImages) {
            const images = Array.isArray(req.files.floodImages) ? req.files.floodImages : [req.files.floodImages];
            
            for (const image of images) {
                const fileName = await addToIMGFolder(image);
                await pooled_db.query(`
                    INSERT INTO anh_ngap_tu_dan_bao_cao (ten, ma_bao_cao_ngap_tu_dan)
                    VALUES ($1, $2)
                `, [fileName, maBaoCao]);
                console.log("✅ Đã thêm ảnh:", fileName);
            }
        }
        
        res.json({ success: true, message: 'Gửi báo cáo thành công' });
        
    } catch (error) {
        console.error('❌ Lỗi khi xử lý báo cáo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Khởi động server
app.listen(process.env.SV_PORT, () => {
    console.log(`Ứng dụng đang chạy tại http://localhost:${process.env.SV_PORT}`);
});