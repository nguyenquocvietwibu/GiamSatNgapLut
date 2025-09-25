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

// Kiểm tra kết nối
pool.connect()
    .then(client => {
        console.log("✅ Kết nối PostgreSQL thành công!");
        client.release();
    })
    .catch(err => console.error("❌ Lỗi kết nối:", err.stack));

module.exports = pool;
