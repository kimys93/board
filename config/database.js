const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'board_user',
    password: process.env.DB_PASSWORD || 'board_password',
    database: process.env.DB_NAME || 'board_db',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
};

const pool = mysql.createPool(dbConfig);

// 연결 테스트
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('데이터베이스 연결 성공');
        connection.release();
    } catch (err) {
        console.error('데이터베이스 연결 실패:', err);
    }
})();

module.exports = pool;
