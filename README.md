# MikSNMP Portal - Deployment Guide

This guide provides step-by-step instructions to deploy the MikSNMP Portal (Frontend + Node.js Backend) on a fresh **Ubuntu 22.04 / 24.04 Server** for production.

---

## 1. Initial Server Setup & Dependencies

First, update your server and install the necessary dependencies: Node.js, MySQL, Apache, and PM2.

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20 recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL Server
sudo apt install -y mysql-server

# Install Apache
sudo apt install -y apache2

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
node alter-db-routers.js
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

## 7. Configure Apache

Apache will serve the compiled React app (`dist` folder) and proxy `/api` requests to the Node.js backend.

First, enable the required Apache modules for proxying and URL rewriting:

```bash
sudo a2enmod proxy proxy_http rewrite
sudo systemctl restart apache2
```

Create a new Apache virtual host configuration file:

```bash
sudo nano /etc/apache2/sites-available/miksnmp.conf
```

Paste the following configuration (Replace `your_domain_or_ip` with your server's public IP address or domain name):

```apache
<VirtualHost *:80>
    ServerName miksnmp.teamzero.bd

    # Serve the React Frontend
    DocumentRoot /var/www/miksnmp/dist

    <Directory /var/www/miksnmp/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Rewrite routing for React Router
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.html [QSA,L]
    </Directory>

    # Proxy API requests to Node Backend
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/

    ErrorLog ${APACHE_LOG_DIR}/miksnmp_error.log
    CustomLog ${APACHE_LOG_DIR}/miksnmp_access.log combined
</VirtualHost>
```

Enable the site and restart Apache:

```bash
# Enable the site configuration
sudo a2ensite miksnmp.conf

# Test Apache config for syntax errors
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

## 8. Done!
You can now visit your server's IP address or domain in your web browser.
- **URL**: `http://miksnmp.teamzero.bd`
- **Default Login**: `admin` / `admin` (You will be prompted to change this on first login).

---

## 9. Adding SSL (HTTPS) with Cloudflare

Since your nameservers are on Cloudflare, you have two great options for enabling SSL. **Method A is highly recommended** because it's easier and the certificate lasts up to 15 years.

### Method A: Cloudflare Origin CA Certificate (Recommended)
This method assumes your DNS record in Cloudflare is set to **Proxied (Orange Cloud)**.

1. Go to your Cloudflare Dashboard -> **SSL/TLS** -> **Origin Server**.
2. Click **Create Certificate**. Keep the default settings (RSA) and click **Create**.
3. You will see an **Origin Certificate** and a **Private Key**. 
4. On your Ubuntu server, save these to files:
   ```bash
   sudo nano /etc/ssl/certs/miksnmp.pem
   # (Paste the Origin Certificate here and save)

   sudo nano /etc/ssl/private/miksnmp.key
   # (Paste the Private Key here and save)
   ```
5. Enable the Apache SSL module:
   ```bash
   sudo a2enmod ssl
   ```
6. Update your Apache config (`sudo nano /etc/apache2/sites-available/miksnmp.conf`) to serve on port 443:
   ```apache
   <VirtualHost *:443>
       ServerName miksnmp.teamzero.bd
       
       SSLEngine on
       SSLCertificateFile /etc/ssl/certs/miksnmp.pem
       SSLCertificateKeyFile /etc/ssl/private/miksnmp.key

       DocumentRoot /var/www/miksnmp/dist
       <Directory /var/www/miksnmp/dist>
           Options -Indexes +FollowSymLinks
           AllowOverride All
           Require all granted
           RewriteEngine On
           RewriteCond %{REQUEST_FILENAME} !-f
           RewriteCond %{REQUEST_FILENAME} !-d
           RewriteRule ^ index.html [QSA,L]
       </Directory>

       ProxyPreserveHost On
       ProxyPass /api/ http://localhost:3001/api/
       ProxyPassReverse /api/ http://localhost:3001/api/
   </VirtualHost>
   ```
7. Restart Apache: `sudo systemctl restart apache2`
8. Finally, go to Cloudflare Dashboard -> **SSL/TLS** -> **Overview** and set the encryption mode to **Full (strict)**.

### Method B: Let's Encrypt (Certbot)
Use this method if your Cloudflare DNS record is set to **DNS Only (Grey Cloud)**.

1. Install Certbot and the Apache plugin:
   ```bash
   sudo apt install -y certbot python3-certbot-apache
   ```
2. Run Certbot to automatically configure SSL for your domain:
   ```bash
   sudo certbot --apache -d miksnmp.teamzero.bd
   ```
3. Follow the prompts. Certbot will automatically edit your `miksnmp.conf` file to add the SSL certificates and setup HTTP-to-HTTPS redirection.

---
### Troubleshooting
- **Backend Logs**: If the API is failing, check the Node.js logs using `pm2 logs miksnmp-backend`
- **Apache Logs**: Check Apache access/error logs using `sudo tail -f /var/log/apache2/miksnmp_error.log`
