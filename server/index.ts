import "dotenv/config";
import os from "os";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./utils";
import { serveStatic } from "./static";
import { storage, db } from "./storage";
import { hlsStreamer } from "./streaming";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve HLS segments
app.use('/hls', express.static(hlsStreamer.getHLSDirectory()));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Run database migrations to ensure schema is up to date
async function runDatabaseMigrations() {
  console.log('[Migration] Checking database schema...');
  try {
    // Add missing columns to classes table
    await db.execute(sql`ALTER TABLE classes ADD COLUMN IF NOT EXISTS subject TEXT`);
    await db.execute(sql`ALTER TABLE classes ADD COLUMN IF NOT EXISTS mentor_email TEXT`);
    await db.execute(sql`ALTER TABLE classes ADD COLUMN IF NOT EXISTS mode TEXT`);
    console.log('[Migration] Classes table schema updated successfully');

    // Add missing columns to class_students table
    await db.execute(sql`ALTER TABLE class_students ADD COLUMN IF NOT EXISTS student_id TEXT`);
    await db.execute(sql`ALTER TABLE class_students ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW()`);
    console.log('[Migration] class_students table schema updated successfully');

    // Fix marks table - handle potential old schema with obsolete columns
    try {
      // Drop obsolete columns that don't exist in our schema
      await db.execute(sql`ALTER TABLE marks DROP COLUMN IF EXISTS subject`);
      await db.execute(sql`ALTER TABLE marks DROP COLUMN IF EXISTS date`);
      console.log('[Migration] Dropped obsolete columns (subject, date) from marks table');
    } catch (dropErr) {
      // If drop fails, try to make them nullable
      try {
        await db.execute(sql`ALTER TABLE marks ALTER COLUMN subject DROP NOT NULL`);
        console.log('[Migration] Made subject column nullable');
      } catch (e) { /* column may not exist */ }
      try {
        await db.execute(sql`ALTER TABLE marks ALTER COLUMN date DROP NOT NULL`);
        console.log('[Migration] Made date column nullable');
      } catch (e) { /* column may not exist */ }
    }

    // Add missing columns to marks table
    await db.execute(sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS assessment1 INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS assessment2 INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS task INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS project INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS final_validation INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS total INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
    await db.execute(sql`ALTER TABLE marks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
    console.log('[Migration] Marks table schema updated successfully');

    // Add claimed_at column to leads table for 120-min auto-release timer
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP`);
    console.log('[Migration] leads.claimed_at column added successfully');
  } catch (error: any) {
    console.error('[Migration] Error updating schema:', error.message);
    // Don't fail startup, the columns might already exist
  }
}

// Initialize manager user
async function initializeManagerUser() {
  const rawEmail = process.env.MANAGER_EMAIL || 'vcodezmanager@gmail.com';
  const managerEmail = rawEmail.toLowerCase().trim();
  const managerPassword = process.env.MANAGER_PASSWORD || 'VCodezhrm@2025';

  console.log('--------------------------------------------------');
  console.log('[Init] Initializing Manager User...');
  console.log(`[Init] Using Email: ${managerEmail}`);
  console.log(`[Init] Env rawEmail: ${rawEmail}`);
  console.log(`[Init] Env Password length: ${managerPassword.length}`);
  console.log('--------------------------------------------------');

  if (!managerEmail || !managerPassword) {
    console.error("Manager credentials not found in environment variables");
    return;
  }

  try {
    // Check if manager user already exists
    const existingManager = await storage.getUserByEmail(managerEmail);

    if (!existingManager) {
      console.log(`[Init] Manager not found, creating user...`);
      // Create new manager user with stable ID
      const hashedPassword = await bcrypt.hash(managerPassword, 10);
      const managerUser = await storage.createUser({
        id: 'manager-123',
        email: managerEmail,
        firstName: "VCodez",
        lastName: "Manager",
        fullName: "VCodez Manager",
        passwordHash: hashedPassword,
        role: "manager",
        isActive: true,
      });
      console.log(`[Init] Manager user created successfully: ${managerUser.email} (ID: manager-123)`);
    } else if (existingManager.id !== 'manager-123') {
      // Manager exists but with a different (random) ID - fix it
      console.log(`[Init] Manager exists with mismatched ID: ${existingManager.id}, fixing to manager-123...`);
      try {
        // Delete the old user and recreate with stable ID
        await db.execute(sql`DELETE FROM users WHERE email = ${managerEmail}`);
        const hashedPassword = await bcrypt.hash(managerPassword, 10);
        await storage.createUser({
          id: 'manager-123',
          email: managerEmail,
          firstName: "VCodez",
          lastName: "Manager",
          fullName: "VCodez Manager",
          passwordHash: hashedPassword,
          role: "manager",
          isActive: true,
        });
        console.log(`[Init] Manager user recreated with stable ID: manager-123`);
      } catch (fixErr: any) {
        console.error('[Init] Error fixing manager ID:', fixErr.message);
      }
    } else {
      console.log(`[Init] Manager user already exists: ${existingManager.email} (ID: ${existingManager.id})`);
      // Update existing manager user's password if needed
      const isPasswordValid = await bcrypt.compare(managerPassword, existingManager.passwordHash || '');
      if (!isPasswordValid) {
        console.log(`[Init] Password change detected, updating...`);
        const hashedPassword = await bcrypt.hash(managerPassword, 10);
        await storage.updateUser(existingManager.id, {
          passwordHash: hashedPassword,
          role: "manager",
          isActive: true,
        });
        console.log(`[Init] Manager user password updated: ${existingManager.email}`);
      } else {
        console.log(`[Init] Password is already correct.`);
      }
    }
  } catch (error: any) {
    console.error('[Init] Error initializing manager:', error.message);
  }
}

(async () => {
  // Run database migrations first
  await runDatabaseMigrations();

  // Initialize manager user before starting the server
  await initializeManagerUser();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: false,
  }, () => {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const name of Object.keys(interfaces)) {
      const ifaces = interfaces[name];
      if (ifaces) {
        for (const iface of ifaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            addresses.push(iface.address);
          }
        }
      }
    }

    log(`serving on port ${port}`);
    log(`Local: http://localhost:${port}`);
    addresses.forEach(addr => log(`Ethernet: http://${addr}:${port}`));

    // Start the 120-minute auto-release timer (checks every 2 minutes)
    const AUTO_RELEASE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
    const AUTO_RELEASE_EXPIRY_MINUTES = 120; // 120 minutes

    setInterval(async () => {
      try {
        const released = await storage.releaseExpiredNewLeads(AUTO_RELEASE_EXPIRY_MINUTES);
        if (released > 0) {
          console.log(`[Auto-Release Timer] Released ${released} expired new leads back to common pool`);
        }
      } catch (error) {
        console.error('[Auto-Release Timer] Error:', error);
      }
    }, AUTO_RELEASE_INTERVAL_MS);

    console.log(`[Auto-Release Timer] Started - checking every ${AUTO_RELEASE_INTERVAL_MS / 60000} minutes for leads older than ${AUTO_RELEASE_EXPIRY_MINUTES} minutes`);
  });
})();
