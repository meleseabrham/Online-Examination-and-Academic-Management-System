import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/project/Online Exam/backend/.env' });

const TEST_EMAIL = 'admin@example.com';
const SECRET = process.env.JWT_SECRET;

const test = async () => {
    try {
        // Create a dummy admin token
        const token = jwt.sign(
            { id: 1, email: TEST_EMAIL, role: 'Admin' },
            SECRET,
            { expiresIn: '1h' }
        );

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('Hit dashboard/stats...');
        try {
            const res = await axios.get('http://localhost:5000/api/admin/dashboard/stats', config);
            console.log('Stats:', res.data);
        } catch (err) {
            console.error('Stats FAIL:', err.response?.status, err.response?.data || err.message);
        }

        console.log('Hit academic-years...');
        try {
            const res = await axios.get('http://localhost:5000/api/admin/academic-years', config);
            console.log('AY:', res.data.length, 'records');
        } catch (err) {
            console.error('AY FAIL:', err.response?.status, err.response?.data || err.message);
        }

    } catch (err) {
        console.error('TOTAL FAIL:', err.message);
    }
};

test();
