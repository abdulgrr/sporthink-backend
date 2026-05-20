const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const railwayConfig = {
        host: process.env.RAILWAY_DB_HOST,
        user: process.env.RAILWAY_DB_USER,
        password: process.env.RAILWAY_DB_PASSWORD,
        database: process.env.RAILWAY_DB_NAME,
        port: parseInt(process.env.RAILWAY_DB_PORT) || 3306,
    };

    try {
        console.log('Connecting to Railway DB...');
        const conn = await mysql.createConnection(railwayConfig);
        console.log('Connected.');

        const [tables] = await conn.query('SHOW TABLES');
        console.log('Tables on Railway:');
        console.log(JSON.stringify(tables, null, 2));

        await conn.end();
    } catch (err) {
        console.error('Error stack:', err.stack);
    }
}
run();
