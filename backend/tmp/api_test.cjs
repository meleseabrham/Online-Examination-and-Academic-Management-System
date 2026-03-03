const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'c:/project/Online Exam/backend/.env' });

const token = jwt.sign({ id: 1, role: 'Admin' }, process.env.JWT_SECRET);

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/dashboard/stats',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer ' + token
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
    });
});

req.on('error', (e) => console.error(e));
req.end();
