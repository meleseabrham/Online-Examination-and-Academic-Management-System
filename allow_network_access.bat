@echo off
echo Setting Network Profiles to Private and enabling Firewall Ports 5173 & 5000...
powershell -Command "Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue"
powershell -Command "New-NetFirewallRule -DisplayName 'Online Exam Frontend (5173)' -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue"
powershell -Command "New-NetFirewallRule -DisplayName 'Online Exam Backend (5000)' -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue"
echo Done! Please try accessing http://172.19.4.108:5173 from your other device now.
pause
