import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.tsx'
import './index.css'

// Dynamically target the host machine's API port 5000 when accessed from other devices on the LAN
axios.interceptors.request.use((config) => {
    if (config.url && config.url.includes('http://localhost:5000')) {
        const currentHost = window.location.hostname;
        config.url = config.url.replace('http://localhost:5000', `http://${currentHost}:5000`);
    }
    return config;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)

