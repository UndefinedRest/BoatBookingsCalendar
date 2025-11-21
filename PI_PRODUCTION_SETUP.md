# Production Raspberry Pi Setup Guide

Complete guide for setting up a production Raspberry Pi with standardized "boatshed" user.

## Overview

This guide creates a production-ready Raspberry Pi with:
- ✅ Standardized `boatshed` service account
- ✅ Secure configuration
- ✅ Auto-start on boot
- ✅ Consistent deployment across all club Pis

---

## Prerequisites

### Hardware
- Raspberry Pi 4 (4GB+) or Pi 5 (8GB recommended)
- 32GB+ microSD card (Class 10 or UHS-1)
- Official Raspberry Pi power supply
- HDMI monitor/TV
- Ethernet cable (recommended) or WiFi
- Keyboard (for initial setup)

### Information Needed
- [ ] RevSport username
- [ ] RevSport password
- [ ] Device name (e.g., "Main Entrance Display")
- [ ] Network IP address (optional - for static IP)

---

## Part 1: OS Installation

### 1. Download Raspberry Pi Imager

Download from: https://www.raspberrypi.com/software/

### 2. Flash Raspberry Pi OS

1. **Insert microSD card** into your computer

2. **Open Raspberry Pi Imager**

3. **Choose OS:**
   - Click "Choose OS"
   - Select: **Raspberry Pi OS (64-bit)**
   - Use full desktop version (NOT Lite)

4. **Choose Storage:**
   - Select your microSD card

5. **Configure Settings** (click gear icon ⚙️):
   ```
   General:
   ✅ Set hostname: lmrc-boatshed-01 (or 02, 03, etc.)
   ✅ Set username and password:
      - Username: boatshed
      - Password: [create secure password - save it!]
   ✅ Configure wireless LAN (if using WiFi):
      - SSID: [your club WiFi]
      - Password: [WiFi password]
   ✅ Set locale settings:
      - Timezone: Australia/Sydney
      - Keyboard layout: us (or your layout)

   Services:
   ✅ Enable SSH
      - Use password authentication
   ```

6. **Write:**
   - Click "Write"
   - Confirm when prompted
   - Wait ~5-10 minutes

### 3. First Boot

1. **Prepare the Pi:**
   - Remove microSD from computer
   - Insert into Raspberry Pi
   - Connect monitor via HDMI
   - Connect keyboard
   - Connect ethernet cable (or use WiFi)
   - Connect power (Pi boots automatically)

2. **Wait for boot** (~2 minutes)
   - Desktop should appear
   - Login with: `boatshed` / [your password]

---

## Part 2: Initial Configuration

### 1. Update System

Open terminal and run:

```bash
# Update package lists
sudo apt update

# Upgrade all packages (takes 5-10 minutes)
sudo apt upgrade -y

# Install Git
sudo apt install -y git

# Reboot to apply updates
sudo reboot
```

Wait for Pi to restart (~1 minute).

### 2. Verify Network Connection

```bash
# Check IP address
hostname -I

# Test internet connection
ping -c 4 google.com
```

**Record the IP address** - you'll need it to access the application.

### 3. Configure Static IP (Recommended)

**Option A: Router DHCP Reservation (Recommended)**
- Log into your router admin
- Find Pi's MAC address
- Create DHCP reservation (e.g., 192.168.1.50)

**Option B: Static IP on Pi**

```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end:
```
interface eth0
static ip_address=192.168.1.50/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

Save (Ctrl+X, Y, Enter) and reboot:
```bash
sudo reboot
```

---

## Part 3: Application Deployment

### 1. SSH into the Pi

From your computer:
```bash
ssh boatshed@<pi-ip-address>
```

### 2. Clone the Application

```bash
cd ~
git clone https://github.com/UndefinedRest/BoatBookingsCalendar.git lmrc-booking-system
cd lmrc-booking-system
```

### 3. Run Deployment Script

```bash
chmod +x deploy-pi.sh
./deploy-pi.sh
```

The script will:
- ✅ Install Node.js 20.x
- ✅ Install dependencies
- ✅ Build the application
- ✅ Create .env file
- ✅ Install PM2 process manager
- ✅ Start the application
- ✅ Configure auto-start on boot

### 4. Configure Credentials

When prompted, edit the .env file:

```bash
nano .env
```

Update these lines:
```env
REVSPORT_USERNAME=your_actual_username
REVSPORT_PASSWORD=your_actual_password
```

Save: **Ctrl+X, Y, Enter**

Restart the application:
```bash
pm2 restart lmrc-booking-viewer
```

### 5. Verify Application is Running

```bash
# Check status
pm2 status

# View logs (should show no errors)
pm2 logs lmrc-booking-viewer --lines 20

# Test local access
curl http://localhost:3001
```

---

## Part 4: Display Configuration

### 1. Configure Kiosk Mode (Auto-start browser fullscreen)

Install Chromium kiosk package:

```bash
sudo apt install -y chromium-browser unclutter
```

Create autostart script:

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/kiosk.desktop
```

Add this content:
```ini
[Desktop Entry]
Type=Application
Name=LMRC Booking Display
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble http://localhost:3001/tv
X-GNOME-Autostart-enabled=true
```

Save (Ctrl+X, Y, Enter)

### 2. Disable Screen Blanking

```bash
# Edit lightdm config
sudo nano /etc/lightdm/lightdm.conf
```

Find the `[Seat:*]` section and add:
```ini
[Seat:*]
xserver-command=X -s 0 -dpms
```

Or create the file if it doesn't exist.

### 3. Test Kiosk Mode

Reboot to test:
```bash
sudo reboot
```

The Pi should:
- ✅ Boot to desktop
- ✅ Auto-login as boatshed
- ✅ Auto-start Chromium in fullscreen
- ✅ Display the TV view at http://localhost:3001/tv

---

## Part 5: Final Configuration

### 1. Test Network Access

From another computer on the network:
```
http://<pi-ip-address>:3001
```

You should see the booking calendar.

### 2. Configure Firewall (Optional)

```bash
# Allow port 3001
sudo ufw allow 3001/tcp

# Enable firewall
sudo ufw enable
```

### 3. Label the Device

Create a label for the physical Pi:
```
LMRC Boatshed Display
Username: boatshed
Hostname: lmrc-boatshed-01
IP: 192.168.1.50
URL: http://192.168.1.50:3001
```

---

## Management & Maintenance

### Application Updates

```bash
ssh boatshed@<pi-ip-address>
cd ~/lmrc-booking-system
git pull origin main
npm install
npm run build
pm2 restart lmrc-booking-viewer
pm2 logs lmrc-booking-viewer --lines 20
```

### System Updates (monthly)

```bash
ssh boatshed@<pi-ip-address>
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### View Application Status

```bash
ssh boatshed@<pi-ip-address>
pm2 status
pm2 logs lmrc-booking-viewer
pm2 monit  # Real-time monitoring
```

### Restart Application

```bash
ssh boatshed@<pi-ip-address>
pm2 restart lmrc-booking-viewer
```

### Restart Pi

```bash
ssh boatshed@<pi-ip-address>
sudo reboot
```

---

## Security Best Practices

### ✅ What We've Done
- Secure service account (`boatshed`, not default `pi`)
- Unique password per device
- SSH access enabled for remote management
- Application runs as non-root user
- Firewall configured (if enabled)

### ❌ Not Exposed
- No internet-facing ports
- No port forwarding
- Behind club network firewall
- Only accessible on local network

### 🔒 Additional Security (Optional)
- SSH key authentication instead of password
- Fail2ban for brute-force protection
- VPN for remote access instead of exposing SSH

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 status
pm2 status

# View detailed logs
pm2 logs lmrc-booking-viewer --lines 50

# Restart PM2
pm2 restart lmrc-booking-viewer

# If still failing, check build
cd ~/lmrc-booking-system
npm run build
```

### Can't Access from Network

```bash
# Check if app is running
pm2 status

# Check firewall
sudo ufw status

# Test from Pi itself
curl http://localhost:3001

# Check IP address
hostname -I
```

### Screen Blanking/Sleeping

```bash
# Disable screen blanking
sudo nano /etc/lightdm/lightdm.conf

# Add under [Seat:*]:
xserver-command=X -s 0 -dpms

# Reboot
sudo reboot
```

### Kiosk Not Auto-starting

```bash
# Check autostart file
cat ~/.config/autostart/kiosk.desktop

# Test manually
chromium-browser --kiosk http://localhost:3001/tv
```

---

## Backup & Recovery

### Backup Configuration

```bash
# Backup .env file (contains credentials)
cd ~/lmrc-booking-system
cp .env ~/.env.backup

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/.pm2/dump.pm2.backup
```

### Full SD Card Backup

Use **Win32DiskImager** or **Raspberry Pi Imager** to create full SD card image.

**Recommended schedule:** After initial setup and before major changes.

---

## Production Checklist

Before deploying to production:

- [ ] Raspberry Pi OS installed with `boatshed` user
- [ ] Static IP configured
- [ ] System updated (`sudo apt update && sudo apt upgrade`)
- [ ] Application cloned from GitHub
- [ ] Dependencies installed (`npm install`)
- [ ] Application built (`npm run build`)
- [ ] Credentials configured in `.env`
- [ ] PM2 running application (`pm2 status`)
- [ ] Auto-start configured (`pm2 save` + startup script)
- [ ] Kiosk mode configured (if using TV display)
- [ ] Accessible from network (test from another device)
- [ ] Credentials backed up (`.env` file saved securely)
- [ ] Device labeled with hostname and IP
- [ ] Documentation updated with device details

---

## Device Documentation Template

Keep a record of each Pi:

```
Device: LMRC Boatshed Display #1
Location: Main Entrance
Hostname: lmrc-boatshed-01
Username: boatshed
Password: [stored in password manager]
IP Address: 192.168.1.50
MAC Address: [from hostname -I]
Installed: 2025-11-21
Last Updated: 2025-11-21
Notes: Primary display, 7" touchscreen
```

---

## Next Steps

1. ✅ Test for 24-48 hours
2. ✅ Monitor logs for errors
3. ✅ Verify auto-restart after reboot
4. ✅ Create backup of SD card
5. ✅ Document deployment in device log
6. ✅ Deploy additional Pis as needed

---

**Questions or issues?** Check [DEPLOY-PI.md](DEPLOY-PI.md) or [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (if exists).
