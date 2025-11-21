# ⚠️ DEPRECATED: Simple PM2 Deployment

## 🚨 THIS DEPLOYMENT METHOD IS DEPRECATED

**For production deployments, use the [Dual-App Deployment System](../lmrc-pi-deployment/README.md) instead.**

This simple PM2-based deployment is kept for:
- Development/testing purposes only
- Legacy reference
- Quick single-app deployments (not recommended for production)

---

## Production Deployment

👉 **Use this instead**: [lmrc-pi-deployment](../lmrc-pi-deployment/README.md)

The production dual-app deployment system provides:
- ✅ systemd-based service management
- ✅ Switch between Booking Viewer and Noticeboard
- ✅ Kiosk mode for TV displays
- ✅ Centralized credential management
- ✅ Production-ready auto-restart and logging

---

## Legacy PM2 Deployment (Development Only)

Quick guide for deploying ONLY the Booking Viewer using PM2 (development/testing).

## Prerequisites

- Raspberry Pi (any model with 1GB+ RAM)
- Raspberry Pi OS installed with **"boatshed"** user (production standard)
- Pi connected to club network
- SSH access to the Pi

**Note:** This guide uses "boatshed" as the standard production username. The application works with any username, but using "boatshed" ensures consistency across all deployments.

## One-Command Deployment

### Step 1: Clone repository on the Pi

SSH into your Raspberry Pi:
```bash
ssh boatshed@<pi-ip-address>
```

Clone the repository:
```bash
cd ~
git clone https://github.com/UndefinedRest/BoatBookingsCalendar.git lmrc-booking-system
cd lmrc-booking-system
```

**Alternative (if using different username for testing):**
```bash
# The app works with any username - just use your actual username
ssh your-username@<pi-ip-address>
cd ~
git clone https://github.com/UndefinedRest/BoatBookingsCalendar.git lmrc-booking-system
cd lmrc-booking-system
```

### Step 2: Run deployment script

On the Raspberry Pi:
```bash
chmod +x deploy-pi-legacy.sh
./deploy-pi-legacy.sh
```

The script will:
1. ✅ Check/install Node.js 20.x
2. ✅ Install dependencies
3. ✅ Build the application
4. ✅ Create .env file (you'll need to edit it)
5. ✅ Install PM2 process manager
6. ✅ Start the application
7. ✅ Configure auto-start on boot

### Step 3: Edit credentials

When prompted, edit the .env file:
```bash
nano .env
```

Update these lines:
```env
REVSPORT_USERNAME=your_username
REVSPORT_PASSWORD=your_password
```

Save and exit (Ctrl+X, Y, Enter)

Restart the app:
```bash
pm2 restart lmrc-booking-viewer
```

## Access the Calendar

From any computer on the club network, open a web browser and go to:

```
http://<pi-ip-address>:3001
```

To find your Pi's IP address:
```bash
hostname -I
```

Example: `http://192.168.1.50:3001`

### Create a Bookmark

For easy access, create a bookmark on club computers with a friendly name:
- **Name:** LMRC Booking Calendar
- **URL:** http://192.168.1.50:3001 (use your actual Pi IP)

## Management Commands

### View logs
```bash
pm2 logs lmrc-booking-viewer
```

### Monitor performance
```bash
pm2 monit
```

### Restart application
```bash
pm2 restart lmrc-booking-viewer
```

### Stop application
```bash
pm2 stop lmrc-booking-viewer
```

### Start application (if stopped)
```bash
pm2 start lmrc-booking-viewer
```

### View status
```bash
pm2 status
```

## Updating the Application

When you make changes or pull updates:

```bash
cd ~/lmrc-booking-system
git pull origin main
npm install  # In case there are new dependencies
npm run build
pm2 restart lmrc-booking-viewer
pm2 logs lmrc-booking-viewer --lines 20  # Verify no errors
```

## Troubleshooting

### Can't access from other computers?

**Check Pi firewall:**
```bash
# Allow port 3001
sudo ufw allow 3001/tcp
```

**Verify app is running:**
```bash
pm2 status
pm2 logs lmrc-booking-viewer
```

**Test from Pi itself:**
```bash
curl http://localhost:3001
```

### Authentication errors?

Check your .env file has correct credentials:
```bash
cat .env | grep REVSPORT
```

View logs for detailed error messages:
```bash
pm2 logs lmrc-booking-viewer --lines 50
```

### High memory usage?

The app uses ~50-100MB of RAM, which is fine for any Pi.

Check current usage:
```bash
pm2 monit
# or
free -h
```

### App not starting on boot?

Re-run the startup command:
```bash
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi
```

## Performance

On a Raspberry Pi 4 (2GB RAM):
- Initial load: ~2-3 seconds
- Cached requests: <5ms
- Memory usage: ~80MB
- CPU usage: <5% average

The Pi can easily handle 50+ simultaneous users viewing the calendar.

## Network Configuration Tips

### Static IP (Recommended)

Give your Pi a static IP so the URL doesn't change:

**Option 1: Router DHCP Reservation**
- Log into your router
- Find the Pi's MAC address
- Create a DHCP reservation (e.g., 192.168.1.50)

**Option 2: Static IP on Pi**
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

Reboot:
```bash
sudo reboot
```

### Local DNS (Optional)

If you have a local DNS server, add:
```
bookings.lmrc.local → 192.168.1.50
```

Then access via: `http://bookings.lmrc.local:3001`

## Security Notes

**For local network use:**
- ✅ Pi is behind club network firewall
- ✅ No exposed ports to internet
- ✅ Only accessible from club computers
- ✅ .env file permissions are restricted (PM2 handles this)

**If you later want internet access:**
- See [DEPLOYMENT.md](DEPLOYMENT.md) for Cloudflare Tunnel setup
- Adds free SSL/HTTPS
- No port forwarding needed
- Takes 10 minutes to set up

## Backup

**Backup the .env file:**
```bash
cp .env .env.backup
# Store this somewhere safe (not in git!)
```

**Full Pi backup (optional):**
Use Win32DiskImager or `dd` to create a full SD card image.

## Cost

- **Hardware:** $0 (you already have the Pi)
- **Electricity:** ~$0.50/month (5W × 24/7)
- **Internet bandwidth:** Negligible (local network only)

**Total ongoing cost: ~$6/year** 🎉

## Next Steps

Once deployed:
1. ✅ Test from multiple club computers
2. ✅ Create bookmarks on club computers
3. ✅ Monitor for a few days to ensure stability
4. ✅ Consider static IP for reliability
5. ✅ Optional: Set up external access (see DEPLOYMENT.md)

---

**Questions?** Check the main [README.md](README.md) or [DEPLOYMENT.md](DEPLOYMENT.md) for more details.
