# Complete Step-by-Step Hosting Guide (Hostinger KVM 2 / Ubuntu)

Follow these exact steps in order. This guide will help you connect to your server, download your code from GitHub, set up your database, and view your live website using just your Server IP address.

## Step 1: Connect to Your Server
1. Go to your **Hostinger Dashboard** -> **VPS**.
2. Find your **VPS IP Address** and **root password** (or reset it if you forgot).
3. Open your computer's terminal (Command Prompt or PowerShell on Windows, Terminal on Mac) and type:
   ```bash
   ssh root@YOUR_SERVER_IP
   ```
   *Type `yes` when asked, then enter your root password.*

## Step 2: Install Required Software
Once logged into the server, paste these commands one by one to install Node.js, PostgreSQL, Git, Nginx, and PM2:

```bash
# Update server
apt update && apt upgrade -y

# Install Git, Nginx, and PostgreSQL
apt install git nginx postgresql postgresql-contrib -y

# Install Node.js (Version 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (keeps your app running 24/7)
npm install -g pm2
```

## Step 3: Create the Database
You only need to create **ONE database**. Follow these steps to set it up:

1. Open the PostgreSQL terminal:
   ```bash
   sudo -u postgres psql
   ```
2. Create the database and user by running these commands (you can change the password `mysecurepassword` to anything you want):
   ```sql
   CREATE DATABASE thulircrm;
   CREATE USER crmuser WITH PASSWORD 'mysecurepassword';
   GRANT ALL PRIVILEGES ON DATABASE thulircrm TO crmuser;
   ALTER DATABASE thulircrm OWNER TO crmuser;
   \q
   ```
3. Your **Database URL** is now: `postgresql://crmuser:mysecurepassword@localhost:5432/thulircrm`

## Step 4: Link GitHub and Download Your Code
1. Generate an SSH key on your server to connect to GitHub:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
   *(Just press **Enter** for all prompts to use the defaults)*
2. View and copy your new key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. Go to your **GitHub Repository** -> **Settings** -> **Deploy Keys** -> **Add deploy key**.
   - Title: `Hostinger Server`
   - Key: *Paste the key you copied in step 2*
4. Clone your code into the server's web directory:
   ```bash
   cd /var/www
   git clone git@github.com:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git crm-app
   cd crm-app
   ```

## Step 5: Setup Environment Variables
You need to tell your app how to connect to the database.

1. Inside the `crm-app` folder, create your `.env` file:
   ```bash
   nano .env
   ```
2. Paste the following into the file (using the Database URL from Step 3):
   ```env
   DATABASE_URL=postgresql://crmuser:mysecurepassword@localhost:5432/thulircrm
   NODE_ENV=production
   ```
3. Press `CTRL + X`, then `Y`, then `Enter` to save and close the file.

## Step 6: Build and Run Your App
Run these commands to install packages, build the app, set up the database tables, and start the server:

```bash
# Install packages
npm install

# Build the frontend and backend
npm run build

# Push tables to the database
npm run db:push

# Start the app in the background using PM2
pm2 start dist/index.js --name "thulircrm"
pm2 save
pm2 startup
```

## Step 7: Preview Without a Domain (Using Nginx)
To view the site using your Server IP address instead of `localhost:5000`, configure Nginx:

1. Open the default Nginx config:
   ```bash
   nano /etc/nginx/sites-available/default
   ```
2. Delete everything inside and paste this:
   ```nginx
   server {
       listen 80 default_server;
       listen [::]:80 default_server;

       # Accept any domain/IP
       server_name _;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
3. Press `CTRL + X`, then `Y`, then `Enter` to save.
4. Restart Nginx to apply changes:
   ```bash
   systemctl restart nginx
   ```

**🎉 YOU ARE DONE!**  
Open your browser and type your **Server IP Address** into the URL bar (e.g., `http://192.168.1.50`). You will see your live HRM CRM running flawlessly!
