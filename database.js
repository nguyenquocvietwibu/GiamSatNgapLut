require('dotenv').config();
const { Pool } = require('pg');

// Tạo connection pool
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});



// // Kiểm tra kết nối với database hiện tại
// pool.query("SELECT current_database() as csdl_hiện_tại;")
//     .then(kết_quả => {
//         console.log("Database được kết nối:", kết_quả.rows[0].csdl_hiện_tại);
//     })
//     .catch(lỗi => {
//         console.error("Lỗi khi lấy tên database:", lỗi);
//     });

// // Kiểm tra liệt kê bảng
// pool.query("SELECT tablename as tên_bảng from pg_tables where schemaname = 'public';")
//     .then(kết_quả => {
//         console.log("các bảng hiện có trong database: ")
//         kết_quả.rows.forEach(row => {
//             console.log(row.tên_bảng)
//         })

//     })
//     .catch(lỗi => {
//         console.error("Lỗi khi lấy các bảng của database: ", lỗi)
//     });

module.exports = pool;
