# Universal Deployment Guide

This HRM Portal application can be deployed on various cloud platforms. Follow the instructions below for your preferred platform.

## Prerequisites

- A PostgreSQL database (most platforms offer managed databases)
- Node.js 20.x or higher
- Environment variables configured

## Environment Variables

All platforms require these environment variables:

```env
PORT=5000
NODE_ENV=production
MANAGER_EMAIL=manager@example.com
MANAGER_PASSWORD=YourSecurePassword123!
DATABASE_URL=postgresql://username:password@host:5432/database
```

Copy `.env.example` to `.env` and update the values.

---

## Platform-Specific Deployment

### 1. Render

#### Automatic Deployment (Recommended)
1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and set up:
   - Web service
   - PostgreSQL database
   - Environment variables

#### Manual Deployment
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Environment**: Node
4. Add a PostgreSQL database
5. Set environment variables in the Render dashboard
6. Deploy!

---

### 2. Heroku

1. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Login: `heroku login`
3. Create a new app:
   ```bash
   heroku create your-app-name
   ```
4. Add PostgreSQL:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```
5. Set environment variables:
   ```bash
   heroku config:set MANAGER_EMAIL=manager@example.com
   heroku config:set MANAGER_PASSWORD=YourSecurePassword123!
   heroku config:set NODE_ENV=production
   ```
6. Deploy:
   ```bash
   git push heroku main
   ```

The `Procfile` is already configured for Heroku.

---

### 3. Railway (Recommended)

1. Go to [Railway](https://railway.app/)
2. Create a new project
3. Add PostgreSQL database from the Railway dashboard
4. Deploy from GitHub:
   - Connect your repository
   - Railway will auto-detect the project using the provided `railway.json` and `nixpacks`
5. Configure Environment Variables in Railway:
   - `DATABASE_URL`: Automatically provided by Railway when you add the PostgreSQL plugin.
   - `PORT`: Automatically managed by Railway (defaults to 5000 in the app if not set).
   - `NODE_ENV`: Set to `production`.
   - `MANAGER_EMAIL`: Your desired admin email.
   - `MANAGER_PASSWORD`: Your desired admin password.
6. The application will automatically run migrations and initialize the manager user on the first start.

---

### 4. DigitalOcean App Platform

1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Create a new app from GitHub
3. Configure:
   - **Build Command**: `npm run build`
   - **Run Command**: `npm run start`
   - **HTTP Port**: 5000
4. Add a managed PostgreSQL database
5. Set environment variables in the app settings
6. Deploy!

---

### 5. Fly.io

1. Install [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. Login: `fly auth login`
3. Launch the app:
   ```bash
   fly launch
   ```
4. Add PostgreSQL:
   ```bash
   fly postgres create
   fly postgres attach <postgres-app-name>
   ```
5. Set secrets:
   ```bash
   fly secrets set MANAGER_EMAIL=manager@example.com
   fly secrets set MANAGER_PASSWORD=YourSecurePassword123!
   ```
6. Deploy:
   ```bash
   fly deploy
   ```

---

### 6. AWS (Optimized - Serverless First)

To minimize costs and leverage the 1TB Free Tier, we recommend a split deployment:

#### Phase A: Frontend (S3 + CloudFront)
1. **Build**: Run `npm run build` locally.
2. **S3**: Create a bucket for the `dist/public` folder and enable "Static Website Hosting".
3. **CloudFront**: Create a distribution pointing to the S3 bucket. 
   - **Cost**: Generous **1TB free data transfer per month** via the AWS Free Tier.
4. **ACM**: Use AWS Certificate Manager for free SSL/TLS certificates.

#### Phase B: Backend (App Runner)
1. **GitHub**: Push your code to a private GitHub repository.
2. **App Runner**: Create a "Service" in AWS App Runner.
3. **Connect**: Link your GitHub repository.
4. **Configure**:
   - **Runtime**: Node.js 20
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Port**: 5000
5. **Environment**: Add your `.env` variables (DATABASE_URL, MANAGER_EMAIL, etc.).

#### Phase C: Database (Neon or Aurora)
- **Option 1**: Keep using the current database on **Neon/Render** (Lowest cost).
- **Option 2**: Use **AWS Aurora Serverless v2** if you require full AWS VPC integration.

---

### 7. AWS (Traditional EC2 + RDS)

1. Launch an EC2 instance (Ubuntu 22.04 recommended)
2. Create an RDS PostgreSQL database
3. SSH into your EC2 instance
4. Install Node.js 20.x:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
5. Clone your repository
6. Create `.env` file with your configuration
7. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
8. Install PM2 for process management:
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "hrm-portal" -- start
   pm2 save
   pm2 startup
   ```
9. Configure nginx as a reverse proxy (optional)

---

### 7. VPS (DigitalOcean, Linode, Vultr, etc.)

1. Provision a VPS with Ubuntu 22.04+
2. Install Node.js 20.x:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. Install PostgreSQL or use a managed database
4. Clone your repository:
   ```bash
   git clone <your-repo-url>
   cd hrm-portal
   ```
5. Create `.env` file:
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```
6. Install and build:
   ```bash
   npm install
   npm run build
   ```
7. Use PM2 for process management:
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "hrm-portal" -- start
   pm2 save
   pm2 startup
   ```
8. Setup nginx as reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

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

---

### 8. Docker Deployment

A `Dockerfile` is provided for containerized deployments:

```bash
docker build -t hrm-portal .
docker run -p 5000:5000 --env-file .env hrm-portal
```

Or use Docker Compose:
```bash
docker-compose up -d
```

---

## Database Setup

After deployment, the application will automatically:
1. Create the manager user on first startup
2. Initialize the database schema

If you need to manually push schema changes:
```bash
npm run db:push
```

---

## Post-Deployment

1. Access your application at your deployment URL
2. Login with your manager credentials
3. Change the default manager password immediately
4. Start managing your HR leads!

---

## Troubleshooting

### Build fails
- Ensure Node.js version is 20.x or higher
- Check that all environment variables are set
- Review build logs for specific errors
- Run `npm ci` instead of `npm install` for clean dependency installation

### "Cannot find package 'vite'" error in production
This error occurs if dev dependencies are imported in production code.
**Solution**: This has been fixed by separating production and development code paths. Ensure you're using the latest version of the codebase.

### Database connection fails
- Verify `DATABASE_URL` is correct
- Check database firewall rules
- Ensure database accepts connections from your host
- Test connection string with: `psql $DATABASE_URL`

### Application won't start
- Check `PORT` environment variable is set (default: 5000)
- Review application logs for stack traces
- Ensure all dependencies installed correctly
- Verify `NODE_ENV` is set to `production`

### Build succeeds but app crashes on startup
- Ensure database is accessible
- Check that `MANAGER_EMAIL` and `MANAGER_PASSWORD` are set
- Verify all required environment variables are present
- Check logs for specific error messages

### WebSocket connection issues
- Ensure your platform supports WebSocket connections
- Check that the WebSocket port is not firewalled
- Verify SSL/TLS is configured for wss:// connections in production

---

## Security Notes

1. **Always** change default manager password in production
2. Use strong, unique passwords
3. Enable HTTPS/SSL on your domain
4. Regularly update dependencies: `npm update`
5. Keep environment variables secure and never commit them to Git

---

## Support

For issues specific to deployment platforms, consult their documentation:
- [Render Docs](https://render.com/docs)
- [Heroku Docs](https://devcenter.heroku.com/)
- [Railway Docs](https://docs.railway.app/)
- [Fly.io Docs](https://fly.io/docs/)
