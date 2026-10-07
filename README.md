# MikSNMP Portal - Deployment Guide

This guide provides step-by-step instructions to deploy the MikSNMP Portal (Frontend + Node.js Backend) on a fresh **Ubuntu 22.04 / 24.04 Server** for production.

---

## 1. Initial Server Setup & Dependencies

First, update your server and install the necessary dependencies: Node.js, MySQL, Nginx, and PM2.

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20 recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL Server
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally (Process Manager for Node.js)
sudo npm install -g pm2
```

## 2. MySQL Database Setup

Log into the MySQL console to create the database and secure the default root user.

```bash
sudo mysql
```

Run the following SQL commands in the MySQL prompt:

```sql
-- Replace 'YourSecurePassword' with a strong password if you wish to use a dedicated user
CREATE DATABASE IF NOT EXISTS miksnmp_db;

-- If your backend uses the root user with no password (as per default dev settings), 
-- you might want to create a dedicated user for production instead:
CREATE USER 'miksnmp_user'@'localhost' IDENTIFIED BY 'miksnmp_pass';
GRANT ALL PRIVILEGES ON miksnmp_db.* TO 'miksnmp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
*(Note: If you use a dedicated user like `miksnmp_user`, remember to update the credentials in `server/db.js` before starting the backend).*

## 3. Clone Repository & Install Dependencies

Assuming you are deploying to `/var/www/miksnmp`:

```bash
# Navigate to web directory
cd /var/www/

# Clone your repository (Replace with your actual repo URL)
sudo git clone https://github.com/yourusername/miksnmp.git

# Set permissions so your user can edit files
sudo chown -R $USER:$USER /var/www/miksnmp

cd miksnmp

# Install project dependencies
npm install
```

## 4. Initialize the Database Tables

Before running the app, we need to generate the database schema and default admin user using the provided setup scripts.

```bash
# Run the database initialization scripts
node server/init_db.js
node alter-db.js
node alter-db2.js
node alter-db-telegram.js
node alter-db-telegram-columns.js
node alter-db-desc.js
node setup-tsdb.js
node alter-db-users.js
```
*This will create the `users` table and seed the default `admin` / `admin` credentials.*

## 5. Build the Frontend

Vite needs to bundle the React frontend for production.

```bash
# Build the React app
npm run build
```
This will generate a `dist` folder containing your static HTML, CSS, and JS files.

## 6. Start the Backend with PM2

We will use PM2 to run the Node.js backend continuously in the background. It will also restart the server automatically if it crashes or if the VPS reboots.

```bash
# Start the backend server
pm2 start server/index.js --name "miksnmp-backend"

# Save the PM2 list so it restores on server reboot
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# (Run the command that PM2 outputs after running `pm2 startup`)
```
Your backend API should now be running on `http://localhost:3001`.

## 7. Configure Nginx

Nginx will serve the compiled React app (`dist` folder) and proxy `/api` requests to the Node.js backend.

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/miksnmp
```

Paste the following configuration (Replace `your_domain_or_ip` with your server's public IP address or domain name):

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

    # Serve the React Frontend
    root /var/www/miksnmp/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
# Enable the site configuration
sudo ln -s /etc/nginx/sites-available/miksnmp /etc/nginx/sites-enabled/

# Remove default nginx config to prevent conflicts
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config for syntax errors
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 8. Done!
You can now visit your server's IP address or domain in your web browser.
- **URL**: `http://your_server_ip`
- **Default Login**: `admin` / `admin` (You will be prompted to change this on first login).

---
### Troubleshooting
- **Backend Logs**: If the API is failing, check the Node.js logs using `pm2 logs miksnmp-backend`
- **Nginx Logs**: Check Nginx access/error logs using `sudo tail -f /var/log/nginx/error.log`
