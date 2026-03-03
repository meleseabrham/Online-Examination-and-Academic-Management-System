import { useState, useEffect } from 'react';
import axios from 'axios';

const SystemBranding = () => {
    const [settings, setSettings] = useState<any>({});

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/auth/system-settings/public');
                const settingsMap = res.data.reduce((acc: any, curr: any) => {
                    acc[curr.SettingKey] = curr.SettingValue;
                    return acc;
                }, {});
                setSettings(settingsMap);
            } catch (err) {
                console.error('Error fetching public settings:', err);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (settings.SchoolName) {
            document.title = settings.SchoolName;
        } else {
            document.title = "Online Examination System";
        }

        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            if (settings.SchoolLogo) {
                favicon.setAttribute('href', `http://localhost:5000${settings.SchoolLogo}`);
            } else {
                favicon.setAttribute('href', '/vite.svg');
            }
        }
    }, [settings]);

    return null;
};

export default SystemBranding;
