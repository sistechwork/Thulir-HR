import type { Express } from "express";
import { createServer, type Server, type IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, db, leads, leadHistory, users, posts, postLikes, postComments, classes, classStudents, eq, and, or, sql, inArray, desc } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./auth";
import { hlsStreamer } from "./streaming";
import { z } from "zod";
import { insertLeadSchema, insertUserSchema, insertLeadHistorySchema, insertClassSchema, insertClassStudentSchema, insertAttendanceSchema, insertMarksSchema } from "@shared/schema";
import multer from "multer";
import xlsx from "xlsx";
import * as bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { sendEmail } from "./email-service";
import { format } from "date-fns";
import crypto from 'crypto';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG and JPG images are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // HLS Streaming endpoints
  app.post('/api/hls/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can control streaming" });
      }

      const { multicastUrl } = req.body;
      const url = multicastUrl || 'udp://239.255.42.42:36666';

      const success = hlsStreamer.start(url);
      if (success) {
        res.json({ success: true, message: "HLS streaming started", playlistUrl: hlsStreamer.getPlaylistUrl() });
      } else {
        res.status(503).json({ success: false, message: "Failed to start streaming" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Error starting stream", error: error.message });
    }
  });

  app.post('/api/hls/stop', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can control streaming" });
      }

      hlsStreamer.stop();
      res.json({ success: true, message: "HLS streaming stopped" });
    } catch (error: any) {
      res.status(500).json({ message: "Error stopping stream" });
    }
  });

  // Email Configuration routes
  app.get('/api/email-config', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from the correct property (matching POST endpoint pattern)
      const userId = req.user?.claims?.sub || req.user?.id;
      console.log('[GET /api/email-config] Fetching email config for user:', userId);
      const config = await storage.getEmailConfig(userId);

      if (config) {
        console.log('[GET /api/email-config] ✓ Found config in database:', {
          id: config.id,
          email: config.smtpEmail?.substring(0, 5) + '...',
          hasPassword: !!config.appPassword,
          server: config.smtpServer,
          port: config.smtpPort,
          isEnabled: config.isEnabled
        });
      } else {
        console.log('[GET /api/email-config] ✗ No config found in database');
        console.log('[GET /api/email-config] User should save config via /email-settings page');
      }

      res.json(config || {});
    } catch (error: any) {
      console.error('[GET /api/email-config] Error:', error);
      res.status(500).json({ message: "Failed to fetch email configuration", error: error.message });
    }
  });


  app.post('/api/email-config', isAuthenticated, async (req: any, res) => {
    try {
      console.log('[POST /api/email-config] ═══════════════════════════════════');
      console.log('[POST /api/email-config] Saving email config to database...');

      // Get user ID from the correct property (matching other endpoints pattern)
      const userId = req.user?.claims?.sub || req.user?.id;

      // Enhanced debugging: Log user authentication details
      console.log('[POST /api/email-config] User details:', {
        userId: userId,
        userIdDirect: req.user?.id,
        claimsSub: req.user?.claims?.sub,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        hasUser: !!req.user
      });

      // Check if user ID exists
      if (!userId) {
        console.error('[POST /api/email-config] ✗ CRITICAL: User ID not found!');
        console.error('[POST /api/email-config] Full req.user object:', JSON.stringify(req.user, null, 2));
        return res.status(401).json({
          message: "Authentication error: User ID not found in session. Please logout and login again.",
          debug: {
            hasUser: !!req.user,
            hasId: !!req.user?.id,
            hasClaimsSub: !!req.user?.claims?.sub
          }
        });
      }

      console.log('[POST /api/email-config] Request body:', {
        smtpEmail: req.body.smtpEmail,
        hasPassword: !!req.body.appPassword,
        passwordLength: req.body.appPassword?.length || 0,
        smtpServer: req.body.smtpServer,
        smtpPort: req.body.smtpPort,
        isEnabled: req.body.isEnabled
      });

      if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'tech-support') {
        console.log('[POST /api/email-config] ✗ Access denied for role:', req.user.role);
        return res.status(403).json({ message: "Only admins, managers, and tech-support can update email configuration" });
      }

      // Validate required fields
      if (!req.body.smtpEmail || !req.body.appPassword || !req.body.smtpServer) {
        console.log('[POST /api/email-config] ✗ Missing required fields');
        return res.status(400).json({
          message: "Missing required fields: smtpEmail, appPassword, smtpServer",
          received: {
            smtpEmail: !!req.body.smtpEmail,
            appPassword: !!req.body.appPassword,
            smtpServer: !!req.body.smtpServer
          }
        });
      }

      console.log('[POST /api/email-config] ✓ Validation passed, calling storage.updateEmailConfig with userId:', userId);
      const config = await storage.updateEmailConfig(userId, req.body);
      console.log('[POST /api/email-config] ✓ Config saved successfully to database!');
      console.log('[POST /api/email-config] Saved config ID:', config.id);
      console.log('[POST /api/email-config] ═══════════════════════════════════');
      res.json(config);
    } catch (error: any) {
      console.error('[POST /api/email-config] ✗ Error saving config:', error);
      console.error('[POST /api/email-config] Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      res.status(500).json({
        message: "Failed to update email configuration",
        error: error.message,
        detail: error.detail || 'No additional details',
        code: error.code || 'UNKNOWN'
      });
    }
  });

  app.post('/api/email-config/test', isAuthenticated, async (req: any, res) => {
    try {
      // Log the complete request body to debug what's being received
      console.log('[POST /api/email-config/test] ═══════════════════════════════════');
      console.log('[POST /api/email-config/test] Request body:', JSON.stringify(req.body, null, 2));

      const { testEmail, config } = req.body;
      console.log('[POST /api/email-config/test] Extracted testEmail:', testEmail);
      console.log('[POST /api/email-config/test] Starting test email to:', testEmail);

      // Debug: Log environment variable status
      console.log('[POST /api/email-config/test] ENV CHECK:', {
        SMTP_EMAIL: process.env.SMTP_EMAIL ? `✓ Set (${process.env.SMTP_EMAIL.substring(0, 5)}...)` : '✗ NOT SET',
        SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '✓ Set (hidden)' : '✗ NOT SET',
        SMTP_SERVER: process.env.SMTP_SERVER || '(default: smtp.gmail.com)',
        SMTP_PORT: process.env.SMTP_PORT || '(default: 587)'
      });

      // Try to get config from request, database, or environment variables (fallback for Render)
      const userId = req.user?.claims?.sub || req.user?.id;
      let smtpConfig = config || await storage.getEmailConfig(userId);

      console.log('[POST /api/email-config/test] Database config check:', {
        hasConfig: !!smtpConfig,
        hasEmail: !!(smtpConfig?.smtpEmail),
        hasPassword: !!(smtpConfig?.appPassword)
      });

      // Fallback to environment variables if database config is missing
      if (!smtpConfig || !smtpConfig.smtpEmail || !smtpConfig.appPassword) {
        console.log('[POST /api/email-config/test] Database config incomplete, checking environment variables...');

        const envEmail = process.env.SMTP_EMAIL;
        const envPassword = process.env.SMTP_PASSWORD;
        const envServer = process.env.SMTP_SERVER || 'smtp.gmail.com';
        const envPort = parseInt(process.env.SMTP_PORT || '587');

        if (envEmail && envPassword) {
          console.log('[POST /api/email-config/test] Using SMTP config from environment variables');
          smtpConfig = {
            id: 0, // Temporary ID for env-based config
            smtpEmail: envEmail,
            appPassword: envPassword,
            smtpServer: envServer,
            smtpPort: envPort,
            isEnabled: true,
            updatedAt: null
          } as any; // Type assertion for env-based config
        } else {
          console.log('[POST /api/email-config/test] ✗ No valid SMTP config found in database or environment');
          console.log('[POST /api/email-config/test] Make sure to set SMTP_EMAIL and SMTP_PASSWORD in Render environment variables');
          return res.status(400).json({
            message: "Email configuration is incomplete. Please configure SMTP settings in /email-settings or set environment variables (SMTP_EMAIL, SMTP_PASSWORD, SMTP_SERVER, SMTP_PORT)."
          });
        }
      }

      if (!testEmail) {
        return res.status(400).json({ message: "Recipient email address is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmail)) {
        return res.status(400).json({ message: "Invalid email address format" });
      }

      console.log('[POST /api/email-config/test] Sending test email via Service...');

      const info = await sendEmail({
        to: testEmail,
        subject: `SMTP Test Email - ${process.env.APP_NAME || 'HRM Portal'}`,
        text: `This is a test email from the HRM Portal configuration verification. If you're receiving this, your email settings are working correctly!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10b981;">✓ Email Test Successful</h2>
            <p>This is a test email from the <b>HRM Portal</b> configuration verification.</p>
            <p>If you're receiving this, your email settings are working correctly!</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #64748b; font-size: 14px;">
              <b>Configuration Details:</b><br>
              Server: ${smtpConfig.smtpServer}<br>
              Port: ${smtpConfig.smtpPort}<br>
              Email: ${smtpConfig.smtpEmail}
            </p>
          </div>
        `
      }, {
        smtpServer: smtpConfig.smtpServer,
        smtpPort: smtpConfig.smtpPort,
        smtpEmail: smtpConfig.smtpEmail,
        appPassword: smtpConfig.appPassword
      });

      console.log('[POST /api/email-config/test] Email sent info:', info);
      res.json({ message: "Test email sent successfully!", info });
    } catch (error: any) {
      console.error('[POST /api/email-config/test] Error:', error);

      let errorMsg = error.message || "Failed to send test email";
      let errorCode = error.code || "UNKNOWN";

      // Provide more helpful error messages for common issues
      if (errorCode === 'ETIMEDOUT') {
        errorMsg = "Connection timed out. Render's free tier blocks SMTP ports (587, 465). Please set 'RESEND_API_KEY' in environment variables to use HTTP email API.";
      }

      res.status(500).json({
        message: errorMsg,
        error: errorMsg,
        errorCode: errorCode
      });
    }
  });

  app.post('/api/tech-support/notify-students', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { classId, subject, message } = req.body;
      let targetStudents = [];
      let className = "";

      if (classId) {
        // Broad notification for a specific class
        const cls = await storage.getClass(parseInt(classId));
        if (!cls) return res.status(404).json({ message: "Class not found" });
        className = cls.name;

        const students = await storage.getClassStudents(parseInt(classId));
        targetStudents = students.filter(s => !!s.email).map(s => ({
          studentName: s.name,
          studentEmail: s.email!,
          className: className,
          date: new Date().toLocaleDateString() // Just a fallback date
        }));
      } else {
        // Original behavior: notify absent students across all mentor's classes
        const mentorEmail = user.email as string;
        targetStudents = await storage.getAbsentDetailsForMentor(mentorEmail);
      }

      if (targetStudents.length === 0) {
        return res.json({ message: "No students found to notify" });
      }

      // Try database config first, fallback to environment variables
      const userId = req.user?.claims?.sub || req.user?.id;
      let smtpConfig = await storage.getEmailConfig(userId);

      if (!smtpConfig || !smtpConfig.smtpEmail || !smtpConfig.appPassword || !smtpConfig.isEnabled) {
        console.log('[POST /api/tech-support/notify-students] Database config incomplete, checking environment variables...');

        const envEmail = process.env.SMTP_EMAIL;
        const envPassword = process.env.SMTP_PASSWORD;
        const envServer = process.env.SMTP_SERVER || 'smtp.gmail.com';
        const envPort = parseInt(process.env.SMTP_PORT || '587');

        if (envEmail && envPassword) {
          console.log('[POST /api/tech-support/notify-students] Using SMTP config from environment variables');
          smtpConfig = {
            id: 0,
            smtpEmail: envEmail,
            appPassword: envPassword,
            smtpServer: envServer,
            smtpPort: envPort,
            isEnabled: true,
            updatedAt: null
          } as any;
        } else {
          return res.status(400).json({ message: "Email configuration is incomplete or disabled. Please configure SMTP settings or set environment variables." });
        }
      }

      const validConfig = smtpConfig!;
      const results = [];
      const config = {
        smtpServer: validConfig.smtpServer,
        smtpPort: validConfig.smtpPort,
        smtpEmail: validConfig.smtpEmail,
        appPassword: validConfig.appPassword
      };

      const userName = user.fullName || user.firstName || user.email || 'Team Support';
      const userEmail = user.email || '';

      for (const student of targetStudents) {
        try {
          const finalSubject = subject || `Absence Notification - ${student.className}`;
          const finalMessage = message
            ? message.replace('{studentName}', student.studentName)
            : `Dear ${student.studentName},\n\nYou were marked absent for the ${student.className} class on ${student.date}. Please ensure you attend the next session.\n\nIf you have any questions, please contact your Team Lead.\n\nBest regards,\n${userName}\n📧 ${userEmail}`;

          // Format HTML version if custom message
          const finalHtml = message
            ? `<p>${finalMessage.replace(/\n/g, '<br>')}</p>`
            : `<p>Dear <b>${student.studentName}</b>,</p>
<p>You were marked absent for the <b>${student.className}</b> class on <b>${student.date}</b>. Please ensure you attend the next session.</p>
<p>If you have any questions, please contact your Team Lead.</p>
<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
<p style="margin: 0;">Best regards,</p>
<p style="margin: 0;"><b>${userName}</b></p>
<p style="margin: 0;">📧 ${userEmail}</p>`;

          await sendEmail({
            to: student.studentEmail,
            from: userEmail ? `"${userName}" <${userEmail}>` : undefined,
            subject: finalSubject,
            text: finalMessage,
            html: finalHtml,
          }, config);
          results.push({ student: student.studentName, status: "Sent" });
        } catch (err: any) {
          console.error(`Failed to notify ${student.studentEmail}:`, err);
          results.push({ student: student.studentName, status: "Failed", error: err.message });
        }
      }

      res.json({ message: `Successfully processed ${results.filter(r => r.status === "Sent").length} notifications`, results });
    } catch (error: any) {
      console.error('[POST /api/tech-support/notify-students] Error:', error);
      res.status(500).json({ message: "Failed to process notifications", error: error.message });
    }
  });



  // ==================== LEAD API ENDPOINTS ====================

  // Get leads for the current user
  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { status, search, page = 1, limit = 20, unassigned, adminSubRole } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;

      let filters: any = { page: pageNum, limit: limitNum, search: search as string };

      if (userRole === 'hr' || userRole === 'tech-support') {
        filters.unassigned = true;
      } else if (userRole === 'accounts' || userRole === 'session-coordinator') {
        filters.status = 'accounts_pending';
      } else if (userRole === 'manager' || userRole === 'admin') {
        const subRole = adminSubRole || (req.query.adminSubRole as string);
        const isSessionOrg = userRole === 'session_organizer' || subRole === 'session_organizer';

        if (isSessionOrg) {
          filters.statuses = ['ready_for_class', 'scheduled'];
        }
        if (status) filters.status = status as string;
      }

      const result = await storage.searchLeads(filters);
      res.json(result);
    } catch (error: any) {
      console.error('[/api/leads] Error:', error);
      res.status(500).json({ message: 'Failed to fetch leads', error: error.message });
    }
  });

  // Update lead endpoint - allows HR and Accounts to update lead information
  app.put('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userRole = req.user.role; // Use role from auth middleware

      console.log(`[Lead Update] User ${userId} (${userRole}) updating lead ${leadId}`);

      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      const currentLead = await storage.getLead(leadId);
      if (!currentLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Build update object with only defined values
      const updateData: any = {};

      // Only include fields that are actually in the request body
      if (req.body.name !== undefined) updateData.name = req.body.name || null;
      if (req.body.email !== undefined) updateData.email = req.body.email || null;
      if (req.body.phone !== undefined) updateData.phone = req.body.phone || null;
      if (req.body.location !== undefined) updateData.location = req.body.location || null;
      if (req.body.degree !== undefined) updateData.degree = req.body.degree || null;
      if (req.body.domain !== undefined) updateData.domain = req.body.domain || null;
      if (req.body.sessionDays !== undefined) updateData.sessionDays = req.body.sessionDays || null;
      if (req.body.walkinDate !== undefined) updateData.walkinDate = req.body.walkinDate || null;
      if (req.body.walkinTime !== undefined) updateData.walkinTime = req.body.walkinTime || null;
      if (req.body.timing !== undefined) updateData.timing = req.body.timing || null;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes || null;
      if (req.body.yearOfPassing !== undefined) updateData.yearOfPassing = req.body.yearOfPassing || null;
      if (req.body.collegeName !== undefined) updateData.collegeName = req.body.collegeName || null;
      if (req.body.registrationAmount !== undefined) updateData.registrationAmount = req.body.registrationAmount || null;
      if (req.body.pendingAmount !== undefined) updateData.pendingAmount = req.body.pendingAmount || null;
      if (req.body.partialAmount !== undefined) updateData.partialAmount = req.body.partialAmount || null;
      if (req.body.transactionNumber !== undefined) updateData.transactionNumber = req.body.transactionNumber || null;
      if (req.body.concession !== undefined) updateData.concession = req.body.concession || null;
      if (req.body.totalAmount !== undefined) updateData.totalAmount = req.body.totalAmount || null;
      if (req.body.program !== undefined) updateData.program = req.body.program || null;

      console.log('[Lead Update] Update data:', updateData);

      // Update the lead
      const updatedLead = await storage.updateLead(leadId, updateData);
      console.log('[Lead Update] Lead updated successfully');

      // Create history entry
      try {
        await storage.createLeadHistory({
          leadId: leadId,
          changedByUserId: userId,
          fromUserId: currentLead.currentOwnerId || null,
          toUserId: currentLead.currentOwnerId || null,
          previousStatus: currentLead.status,
          newStatus: updateData.status || currentLead.status,
          changeReason: req.body.changeReason || "Lead information updated",
          changeData: JSON.stringify({
            action: "update",
            updatedFields: Object.keys(updateData)
          }),
        });
        console.log('[Lead Update] History created successfully');
      } catch (historyError: any) {
        console.error('[Lead Update] History creation failed (non-critical):', historyError.message);
        // Don't fail the request if history creation fails
      }

      res.json({ message: "Lead updated successfully", lead: updatedLead });
    } catch (error: any) {
      console.error('[/api/leads/:id PUT] Error updating lead:', error);
      console.error('[/api/leads/:id PUT] Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to update lead', error: error.message });
    }
  });

  // Bulk update total amount for all leads - Managers only
  app.post('/api/leads/bulk-update-total', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user.role;
      if (userRole !== 'manager' && userRole !== 'admin') {
        return res.status(403).json({ message: "Only managers can perform bulk updates" });
      }

      const { totalAmount } = req.body;
      if (!totalAmount || isNaN(parseFloat(totalAmount))) {
        return res.status(400).json({ message: "Invalid total amount" });
      }

      await storage.updateAllLeadsTotal(totalAmount);
      console.log(`[Bulk Update] Updated all leads with totalAmount: ${totalAmount}`);

      res.json({ message: "All leads updated successfully" });
    } catch (error: any) {
      console.error('[POST /api/leads/bulk-update-total] Error:', error);
      res.status(500).json({ message: 'Failed to update leads', error: error.message });
    }
  });

  // Metrics endpoint for dashboard - calculates total leads, completed, revenue, status distribution
  app.get('/api/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role; // Use role from auth middleware

      // Build filters based on category
      const { category } = req.query;
      const filters: any = {
        page: 1,
        limit: 100000, // Get all leads for accurate metrics
      };

      if (category && category !== 'all') {
        filters.category = category;
      }

      // Fetch all leads with filters
      const result = await storage.searchLeads(filters);
      const allLeads = result.leads || [];
      console.log(`[/api/metrics] Found ${allLeads.length} leads for role ${userRole}`);

      // Calculate metrics
      const totalLeads = allLeads.length;

      // Count completed leads (status = 'completed', 'ready_for_class', or 'accounts_pending')
      // Use case-insensitive check and trim whitespace
      const completedLeads = allLeads.filter((lead: any) => {
        const s = (lead.status || "").toLowerCase().trim();
        return s === 'completed' || s === 'ready_for_class' || s === 'accounts_pending';
      }).length;

      // Calculate revenue (sum of registration + partial amounts)
      // Robust parsing for string/null amounts
      const revenue = allLeads.reduce((total: number, lead: any) => {
        const reg = lead.registrationAmount ? parseFloat(String(lead.registrationAmount)) : 0;
        const partial = lead.partialAmount ? parseFloat(String(lead.partialAmount)) : 0;
        return total + (isNaN(reg) ? 0 : reg) + (isNaN(partial) ? 0 : partial);
      }, 0);

      // Calculate status distribution for the pie chart
      const statusDistribution: { [key: string]: number } = {};
      allLeads.forEach((lead: any) => {
        // Use lowercase for keys to avoid duplicates like 'COMPLETED' and 'completed'
        const status = (lead.status || 'new').toLowerCase().trim();
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      });

      // Calculate HR performance for Allocation Strategy
      // Key: hrId, Value: { name, active, completed, statuses }
      const hrPerformance: Record<string, any> = {};

      // Get all HR users to ensure we include those with 0 activity
      const allUsers = await (storage as any).getUsersByRoleAll ? await (storage as any).getUsersByRoleAll('hr') : await storage.getUsersByRole('hr');
      const hrUsers = Array.isArray(allUsers) ? allUsers : [];

      hrUsers.forEach(u => {
        hrPerformance[u.id] = {
          id: u.id,
          name: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          active: 0,
          completed: 0,
          statuses: {}
        };
      });

      // Attribute completions using Lead History
      // This ensures HR gets credit even after lead is passed to Accounts
      const allHistory = await storage.getAllLeadHistory();
      const completionEvents = allHistory.filter(h => {
        const ns = (h.newStatus || "").toLowerCase().trim();
        return ns === 'completed' || ns === 'ready_for_class' || ns === 'accounts_pending';
      });

      // Use a Set to avoid double counting same lead completions for same HR
      const countedCompletions = new Set<string>();

      completionEvents.forEach(h => {
        const hrId = h.changedByUserId;
        if (hrPerformance[hrId]) {
          const leadKey = `${hrId}-${h.leadId}`;
          if (!countedCompletions.has(leadKey)) {
            hrPerformance[hrId].completed++;
            countedCompletions.add(leadKey);

            // Add to statuses for the badge display (using readable label)
            const statusLabel = (h.newStatus || "completed").toLowerCase();
            hrPerformance[hrId].statuses[statusLabel] = (hrPerformance[hrId].statuses[statusLabel] || 0) + 1;
          }
        }
      });

      // Attribute active leads based on current ownership
      allLeads.forEach((lead: any) => {
        if (lead.currentOwnerId && hrPerformance[lead.currentOwnerId]) {
          const rawStatus = lead.status || 'new';
          const status = rawStatus.toLowerCase().trim();

          // If not completed, it's active for this HR
          if (status !== 'completed' && status !== 'ready_for_class' && status !== 'accounts_pending') {
            hrPerformance[lead.currentOwnerId].active++;

            // Track active statuses
            if (!hrPerformance[lead.currentOwnerId].statuses[rawStatus]) {
              hrPerformance[lead.currentOwnerId].statuses[rawStatus] = 0;
            }
            hrPerformance[lead.currentOwnerId].statuses[rawStatus]++;
          }
        }
      });

      // Calculate correct active HR count (HRs with at least one active lead)
      const activeHRCount = Object.values(hrPerformance).filter((hr: any) => hr.active > 0).length;

      const responseData = {
        totalLeads,
        completedLeads,
        revenue,
        activeHR: activeHRCount,
        statusDistribution,
        hrPerformance: Object.values(hrPerformance)
      };
      console.log(`[/api/metrics] Returning:`, JSON.stringify(responseData));
      res.json(responseData);
    } catch (error: any) {
      console.error('[/api/metrics] Error calculating metrics:', error);
      res.status(500).json({ message: 'Failed to calculate metrics', error: error.message });
    }
  });

  // Recent leads for dashboard activity feed
  app.get('/api/leads/recent', isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.searchLeads({ limit: 12 });
      const recentActivity = result.leads.map((lead: any) => ({
        leadName: lead.name,
        action: `Lead updated: ${lead.status.replace('_', ' ')}`,
        timestamp: lead.updatedAt || lead.createdAt
      }));
      res.json(recentActivity);
    } catch (error: any) {
      console.error('Error fetching recent leads:', error);
      res.status(500).json({ message: 'Failed to fetch recent leads' });
    }
  });

  // All lead history for tracking
  app.get('/api/history/all', isAuthenticated, async (req: any, res) => {
    try {
      const history = await storage.getAllLeadHistory();
      res.json(history);
    } catch (error: any) {
      console.error('Error fetching lead history:', error);
      res.status(500).json({ message: 'Failed to fetch lead history' });
    }
  });

  // Assign lead to self (for HR users claiming leads)
  app.post('/api/leads/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const userId = req.user.claims.sub; // FIX: Use claims.sub instead of id
      const reason = req.body.reason || 'Self-assigned';

      console.log(`[/api/leads/${leadId}/assign] HR user ${userId} claiming lead`);

      // Assign the lead to the current user
      const updatedLead = await storage.assignLead(leadId, userId, userId, reason);

      res.json({ message: 'Lead assigned successfully', lead: updatedLead });
    } catch (error: any) {
      console.error('[/api/leads/:id/assign] Error assigning lead:', error);
      res.status(500).json({ message: 'Failed to assign lead', error: error.message });
    }
  });

  app.get('/api/hls/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can check streaming" });
      }

      const isRunning = hlsStreamer.isStreamRunning();
      const config = hlsStreamer.getConfig();
      res.json({
        running: isRunning,
        playlistUrl: isRunning ? hlsStreamer.getPlaylistUrl() : null,
        config: config
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error getting stream status" });
    }
  });

  // Test camera connection endpoint
  app.get('/api/camera-test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can access camera feed" });
      }

      const cameraUrl = (req.query.cameraUrl as string) || "http://192.168.0.126/";

      const http = require('http');
      const testUrls = ["snapshot.jpg", "image.jpg", "pic.jpg"];

      for (const urlPath of testUrls) {
        const testPromise = new Promise((resolve) => {
          const url = new URL(urlPath, cameraUrl);
          http.get(url, { timeout: 2000 }, (cameraRes: any) => {
            if (cameraRes.statusCode === 200) {
              resolve({ success: true, path: urlPath });
            } else {
              resolve({ success: false });
            }
          }).on('error', () => resolve({ success: false }));
        });

        const result: any = await testPromise;
        if (result.success) {
          return res.json({
            connected: true,
            message: "✓ Camera connected successfully!",
            workingPath: result.path,
            cameraUrl: cameraUrl
          });
        }
      }

      res.status(503).json({
        connected: false,
        message: "✗ Cannot reach camera. Please verify the IP and port forwarding.",
        cameraUrl: cameraUrl
      });
    } catch (error: any) {
      res.status(500).json({ message: "Test failed", error: error.message });
    }
  });

  // Camera snapshot endpoint - fetches a snapshot from the camera
  app.get('/api/camera-snapshot', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can access camera feed" });
      }

      // Get camera URL from query param or use default
      const cameraUrl = (req.query.cameraUrl as string) || "http://192.168.0.126/";

      // Fetch snapshot from camera using built-in http module
      const http = require('http');
      const cameraBaseUrl = cameraUrl;
      const snapshotUrls = [
        "snapshot.jpg",
        "image.jpg",
        "pic.jpg",
        "capture.jpg",
        "stream.jpg",
        "video.cgi"
      ];

      const tryFetchSnapshot = (urlPath: string): Promise<{ success: boolean; data?: any; contentType?: string }> => {
        return new Promise((resolve) => {
          const url = new URL(urlPath, cameraBaseUrl);

          http.get(url, { timeout: 3000 }, (cameraRes: any) => {
            if (cameraRes.statusCode === 200) {
              const chunks: Buffer[] = [];
              cameraRes.on('data', (chunk: Buffer) => chunks.push(chunk));
              cameraRes.on('end', () => {
                resolve({
                  success: true,
                  data: Buffer.concat(chunks),
                  contentType: cameraRes.headers['content-type'] || 'image/jpeg'
                });
              });
            } else {
              resolve({ success: false });
            }
          }).on('error', (err: any) => {
            console.error(`Error fetching ${urlPath}:`, err.message);
            resolve({ success: false });
          });
        });
      };

      // Try each snapshot URL until one succeeds
      let snapshotData: any = null;
      let contentType = 'image/jpeg';

      for (const urlPath of snapshotUrls) {
        const result = await tryFetchSnapshot(urlPath);
        if (result.success) {
          snapshotData = result.data;
          contentType = result.contentType || 'image/jpeg';
          console.log(`✓ Camera snapshot fetched from: ${urlPath}`);
          break;
        }
      }

      if (!snapshotData) {
        return res.status(503).json({ message: "Camera not responding - unable to fetch snapshot" });
      }

      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.send(snapshotData);
    } catch (error: any) {
      console.error("Camera snapshot error:", error);
      res.status(500).json({ message: "Camera snapshot failed", error: error.message });
    }
  });

  // Get leads with "ready_for_class" status for adding to classes
  app.get('/api/leads/ready-for-class', isAuthenticated, async (req: any, res) => {
    try {
      const search = req.query.search as string | undefined;
      const classId = req.query.classId as string | undefined;

      // Get leads with ready_for_class status
      const result = await storage.searchLeads({
        statuses: ['ready_for_class'],
        search: search,
        page: 1,
        limit: 100
      });

      // If classId is provided, filter out students already in the class
      let availableLeads = result.leads;
      if (classId) {
        const existingStudents = await storage.getClassStudents(parseInt(classId));
        const existingIds = new Set(existingStudents.map((s: any) => s.id));
        availableLeads = result.leads.filter((lead: any) => !existingIds.has(lead.id));
      }

      res.json({ leads: availableLeads, total: availableLeads.length });
    } catch (error: any) {
      console.error("Error fetching ready-for-class leads:", error);
      res.status(500).json({ message: "Failed to fetch ready-for-class leads" });
    }
  });

  // Get recent leads (most recently updated)
  app.get('/api/leads/recent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const userRole = currentUser?.role || 'hr';

      let filters: any = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      // Role-based filtering for recent activity
      if (userRole === 'hr') {
        filters.ownerId = userId;
      } else if (userRole === 'accounts') {
        filters.status = 'pending';
      }

      const result = await storage.searchLeads(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching recent leads:", error);
      res.status(500).json({ message: "Failed to fetch recent leads" });
    }
  });


  // Lead details
  app.get('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) return res.status(400).json({ message: "Invalid lead ID" });
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch lead', error: error.message });
    }
  });

  // Class Management API
  app.get('/api/classes/with-counts', isAuthenticated, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const classesResult = await storage.getClassesWithStudentCount(instructorId);
      res.json(classesResult);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch classes', error: error.message });
    }
  });

  app.post('/api/classes', isAuthenticated, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const classData = insertClassSchema.parse({ ...req.body, instructorId });
      const newClass = await storage.createClass(classData);
      res.json(newClass);
    } catch (error: any) {
      res.status(400).json({ message: 'Failed to create class', error: error.message });
    }
  });

  app.delete('/api/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      await storage.deleteClass(classId);
      res.json({ message: 'Class deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to delete class', error: error.message });
    }
  });

  app.post('/api/classes/:id/students', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { leadIds } = req.body;

      if (!Array.isArray(leadIds)) {
        return res.status(400).json({ message: 'leadIds must be an array' });
      }

      for (const leadId of leadIds) {
        await storage.addStudentToClass(classId, leadId);
      }

      res.json({ message: 'Students added successfully' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to add students to class', error: error.message });
    }
  });

  app.get('/api/classes/:id/students', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) return res.status(400).json({ message: 'Invalid class ID' });

      const students = await storage.getClassStudents(classId);
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch class students', error: error.message });
    }
  });

  app.delete('/api/classes/:id/students/:leadId', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const leadId = parseInt(req.params.leadId);

      if (isNaN(classId) || isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid class or lead ID' });
      }

      // Check role - only Admin/Manager/Session Organizer can remove
      const userRole = req.user.role;
      if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'session_organizer') {
        return res.status(403).json({ message: 'Only administrators can remove students' });
      }

      await storage.removeStudentFromClass(classId, leadId);
      res.json({ message: 'Student removed from class successfully' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to remove student from class', error: error.message });
    }
  });

  app.get('/api/my/completed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category, search, page = 1, limit = 20 } = req.query;

      const filters = {
        ownerId: userId,
        status: 'completed',
        category: category as string,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await storage.searchLeads(filters);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch completed leads', error: error.message });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const userEmail = req.user.claims.email;

      // Return user data from session/auth middleware
      return res.json({
        id: userId,
        email: userEmail,
        firstName: userRole === 'manager' ? 'VCodez' : 'User',
        lastName: userRole === 'manager' ? 'Manager' : '',
        fullName: userRole === 'manager' ? 'VCodez Manager' : userEmail,
        role: userRole,
        isActive: true,
        loginType: req.user.loginType || 'password'
      });
    } catch (error: any) {
      console.error('[/api/auth/user] Error:', error);
      res.status(500).json({ message: 'Failed to fetch user', error: error.message });
    }
  });

  // Password-based login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email: rawEmail, password } = req.body;
      const email = rawEmail?.toLowerCase().trim();

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Hardcoded manager login check removed. 
      // All users (including the manager) are now validated against the database.

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user has a password hash (for traditional login)
      if (!user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled. Contact your manager." });
      }

      // Create session for password-based login
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        loginType: 'password'
      };

      console.log(`Password login successful for: ${email} (role: ${user.role})`);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          fullName: user.fullName
        }
      });
    } catch (error) {
      console.error("Password login error:", error);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  // User management routes (Manager only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = (req as any).user?.role || 'hr';
      const userId = (req as any).user?.claims?.sub;

      const { role } = req.query;
      let users;

      console.log(`[GET /api/users] Auth User: ${userId}, Role: ${userRole}`);

      if (userRole === 'manager' || userRole === 'admin' || userRole === 'session-coordinator' || userRole === 'session_organizer') {
        // Managers can see all users (including deactivated ones)
        if (role) {
          users = await storage.getUsersByRoleAll(role as string);
        } else {
          const teamLeadUsers = await storage.getUsersByRoleAll('team_lead');
          const hrUsers = await storage.getUsersByRoleAll('hr');
          const accountsUsers = await storage.getUsersByRoleAll('accounts');
          const adminUsers = await storage.getUsersByRoleAll('admin');
          const techSupportUsers = await storage.getUsersByRoleAll('tech-support');
          const sessionCoordinatorUsers = await storage.getUsersByRoleAll('session-coordinator');
          users = [...teamLeadUsers, ...hrUsers, ...accountsUsers, ...adminUsers, ...techSupportUsers, ...sessionCoordinatorUsers];
        }
      } else if (userRole === 'team_lead') {
        // Team leads can see HR users assigned to them
        const currentUser = await storage.getUser(userId);
        if (role === 'hr' || !role) {
          const allHrUsers = await storage.getUsersByRole('hr');
          users = allHrUsers.filter((u: any) => u.teamLeadId === userId);
        } else {
          return res.status(403).json({ message: "Team leads can only access their team members" });
        }
      } else if (userRole === 'hr') {
        // HR users can only see other HR users (for lead assignment)
        if (role === 'hr' || !role) {
          users = await storage.getUsersByRole('hr');
        } else {
          return res.status(403).json({ message: "HR users can only access HR user list" });
        }
      } else if (userRole === 'accounts') {
        // Accounts users can see HR users (for lead tracking)
        if (role === 'hr' || !role) {
          users = await storage.getUsersByRole('hr');
        } else if (role === 'accounts') {
          users = await storage.getUsersByRole('accounts');
        } else {
          return res.status(403).json({ message: "Accounts users can only access HR and Accounts user lists" });
        }
      } else if (userRole === 'tech-support') {
        // Tech support can see HR users
        if (role === 'hr' || !role) {
          users = await storage.getUsersByRole('hr');
        } else {
          return res.status(403).json({ message: "Tech support users can only access HR user lists" });
        }
      } else {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all tech-support users for mentor dropdown
  // IMPORTANT: This route MUST be defined BEFORE /api/users/:id to prevent "tech-support" being matched as an :id
  app.get('/api/users/tech-support', isAuthenticated, async (req: any, res) => {
    try {
      const techSupportUsers = await storage.getUsersByRole('tech-support');
      // Return only essential info for the dropdown
      const users = techSupportUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
      }));
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching tech-support users:", error);
      res.status(500).json({ message: "Failed to fetch tech-support users" });
    }
  });

  app.get('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Add status for response
      const status = user.isActive ? 'active' : 'deactive';

      res.json({
        ...user,
        status
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = (req as any).user?.role || 'hr';
      const userId = (req as any).user?.claims?.sub;

      if (userRole !== 'manager' && userRole !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const createUserSchema = insertUserSchema.extend({
        fullName: z.string(),
        role: z.enum(['team_lead', 'hr', 'accounts', 'admin', 'tech-support', 'session-coordinator']),
        password: z.string().min(6).optional(),
        teamName: z.string().optional(),
        teamLeadId: z.string().optional(),
        status: z.enum(['active', 'deactive']).optional().default('active')
      });

      const validatedData = createUserSchema.parse(req.body);

      // Check if email already exists
      const email = validatedData.email?.toLowerCase().trim();
      const existingUser = await storage.getUserByEmail(email || '');
      if (existingUser) {
        return res.status(400).json({ message: `Email "${validatedData.email}" is already in use. Please use a different email address.` });
      }

      // Validate team_lead requires teamName with minimum length
      if (validatedData.role === 'team_lead' && (!validatedData.teamName || validatedData.teamName.trim().length < 2)) {
        return res.status(400).json({ message: "Team name is required for Team Lead role (at least 2 characters)" });
      }

      // Validate HR can optionally have teamLeadId
      if (validatedData.teamLeadId && validatedData.role !== 'hr') {
        return res.status(400).json({ message: "Team Lead assignment is only for HR role" });
      }

      // Auto-generate secure password for staff accounts
      const generatePassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      const plainPassword = validatedData.password || generatePassword();
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      // Sanitize data - remove fields that are not in the database table
      const { password: _password, status: _status, ...restOfValidatedData } = validatedData;

      const user = await storage.createUser({
        ...restOfValidatedData,
        id: crypto.randomUUID(),
        username: email,
        email, // Use normalized email
        passwordHash,
        firstName: validatedData.fullName.split(' ')[0],
        lastName: validatedData.fullName.split(' ').slice(1).join(' '),
        isActive: validatedData.status === 'active',
        teamName: validatedData.role === 'team_lead' ? validatedData.teamName : null,
        teamLeadId: validatedData.role === 'hr' ? validatedData.teamLeadId : null
      } as any);

      // Broadcast user creation to managers and admins only
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('user_created', {
          id: user.id,
          fullName: validatedData.fullName,
          role: user.role,
          createdBy: req.user?.claims?.sub || 'unknown'
        }, {
          roles: ['manager', 'admin'] // Only managers and admins see user creation
        });
      }

      console.log(`New user created: ${user.email} (${user.role}) with password: ${plainPassword}`);

      res.json({
        ...user,
        status: validatedData.status,
        tempPassword: plainPassword, // Include generated password in response
        passwordNote: "Share this password securely with the user. They can log in at /login",
        statusNote: validatedData.status === 'deactive' ? "This account is currently inactive and cannot log in." : "This account is active and can log in."
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({
        message: error.message || "Failed to create user",
        detail: error.detail || error.hint || undefined
      });
      // Check for specific database errors
      if (error.code === '23505' && error.detail && error.detail.includes('email')) {
        return res.status(400).json({ message: "Email already exists. Please use a different email address." });
      }
      res.status(500).json({ message: error.message || "Failed to create user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Handle hardcoded manager
      let userRole = 'hr';
      if (userId === 'hardcoded-manager-id') {
        userRole = 'manager';
      } else {
        const currentUser = await storage.getUser(userId);
        userRole = currentUser?.role || 'hr';
      }

      if (userRole !== 'manager' && userRole !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { id } = req.params;
      const updates = req.body;

      // Define allowed fields for update
      const allowedFields = ['firstName', 'lastName', 'fullName', 'email', 'role', 'status', 'teamName', 'teamLeadId', 'profileImageUrl', 'password'];
      const sanitizedUpdates: Record<string, any> = {};

      // Validate and build sanitized updates
      for (const field of allowedFields) {
        if (field in updates && updates[field]) {
          sanitizedUpdates[field] = updates[field];
        }
      }

      // Hash password if provided
      if ('password' in sanitizedUpdates && sanitizedUpdates.password) {
        const hashedPassword = await bcrypt.hash(sanitizedUpdates.password, 10);
        sanitizedUpdates.passwordHash = hashedPassword;
        delete sanitizedUpdates.password;
      }

      // Convert status to isActive boolean
      if ('status' in sanitizedUpdates) {
        if (sanitizedUpdates.status === 'active') {
          sanitizedUpdates.isActive = true;
        } else if (sanitizedUpdates.status === 'deactive') {
          sanitizedUpdates.isActive = false;
        } else {
          return res.status(400).json({ message: "Status must be 'active' or 'deactive'" });
        }
        delete sanitizedUpdates.status; // Remove status from sanitizedUpdates as we use isActive
      }

      const user = await storage.updateUser(id, sanitizedUpdates);

      // Add status for response
      const status = user.isActive ? 'active' : 'deactive';

      console.log(`User updated: ${user.email} by manager`);

      res.json({
        ...user,
        status,
        message: "User details updated successfully"
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Handle hardcoded manager
      let userRole = 'hr';
      if (userId === 'hardcoded-manager-id') {
        userRole = 'manager';
      } else {
        const currentUser = await storage.getUser(userId);
        userRole = currentUser?.role || 'hr';
      }

      if (userRole !== 'manager' && userRole !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });





  // Get classes assigned to current user as mentor (for tech-support sidebar)
  app.get('/api/classes/my-mentor', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      console.log(`[GET /api/classes/my-mentor] User email: ${userEmail}`);

      // Get all classes and filter by mentor email
      const allClasses = await storage.getClassesWithStudentCount();
      const myClasses = allClasses.filter((cls: any) =>
        cls.mentorEmail && cls.mentorEmail.toLowerCase() === userEmail.toLowerCase()
      );

      console.log(`[GET /api/classes/my-mentor] Found ${myClasses.length} classes for mentor ${userEmail}`);
      res.json(myClasses);
    } catch (error: any) {
      console.error("Error fetching mentor classes:", error);
      res.status(500).json({ message: "Failed to fetch mentor classes" });
    }
  });


  // Class Management Endpoints
  app.get("/api/classes", isAuthenticated, async (req: any, res) => {

    try {
      const instructorId = req.query.instructorId as string | undefined;
      const classList = await storage.getClasses(instructorId);
      res.json(classList);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching classes", error: error.message });
    }
  });

  app.get("/api/classes/with-counts", isAuthenticated, async (req: any, res) => {
    try {
      const instructorId = req.query.instructorId as string | undefined;
      const userRole = req.user.role;
      // If admin or session organizer, allow viewing all classes if no instructorId provided
      // Or if instructorId provided, filtered by it.
      // Actually, let's relax: if admin/session_organizer, and no instructorId, return all.
      // If instructorId passed, filter by it.

      console.log(`[GET /api/classes] User: ${req.user.claims.sub}, Role: ${userRole}, QueryInstructor: ${instructorId}`);

      let classList;
      if (!instructorId && (userRole === 'admin' || userRole === 'session_organizer' || userRole === 'session-coordinator')) {
        classList = await storage.getClassesWithStudentCount();
      } else {
        classList = await storage.getClassesWithStudentCount(instructorId);
      }
      res.json(classList);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching classes with counts", error: error.message });
    }
  });

  app.get("/api/classes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const cls = await storage.getClass(parseInt(req.params.id));
      if (!cls) return res.status(404).json({ message: "Class not found" });
      res.json(cls);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching class", error: error.message });
    }
  });


  app.post("/api/classes", isAuthenticated, async (req: any, res) => {
    try {
      console.log('[/api/classes POST] Request received:', JSON.stringify(req.body));
      console.log('[/api/classes POST] User:', req.user.claims.sub, 'Role:', req.user.role);

      const instructorId = req.user.claims.sub;

      // Sanitize empty strings to null for optional fields
      const sanitizedBody = {
        name: req.body.name,
        subject: req.body.subject || null,
        mentorEmail: req.body.mentorEmail || null,
        mode: req.body.mode || null,
      };

      const classData = {
        ...sanitizedBody,
        instructorId: instructorId // Force current user as instructor
      };

      console.log('[/api/classes POST] Sanitized data with instructor:', JSON.stringify(classData));

      const parsed = insertClassSchema.safeParse(classData);
      if (!parsed.success) {
        console.error('[/api/classes POST] Validation failed:', JSON.stringify(parsed.error.errors));
        return res.status(400).json({
          message: "Invalid class data",
          errors: parsed.error.errors,
          receivedData: classData
        });
      }

      console.log('[/api/classes POST] Validation passed, calling storage.createClass');
      const newClass = await storage.createClass(parsed.data);
      console.log('[/api/classes POST] Class created successfully:', newClass.id);
      res.status(201).json(newClass);
    } catch (error: any) {
      console.error('[/api/classes POST] Error:', error);
      console.error('[/api/classes POST] Error stack:', error.stack);
      res.status(500).json({ message: "Error creating class", error: error.message });
    }
  });


  app.put("/api/classes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedClass = await storage.updateClass(id, req.body);
      res.json(updatedClass);
    } catch (error: any) {
      res.status(500).json({ message: "Error updating class", error: error.message });
    }
  });

  app.delete("/api/classes/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteClass(parseInt(req.params.id));
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting class", error: error.message });
    }
  });

  app.get("/api/classes/:id/students", isAuthenticated, async (req: any, res) => {
    try {
      const students = await storage.getClassStudents(parseInt(req.params.id));
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching class students", error: error.message });
    }
  });

  app.post("/api/classes/:id/students", isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { leadId, leadIds } = req.body;

      // Support bulk add with leadIds array, or single add with leadId
      const idsToAdd = leadIds || (leadId ? [leadId] : []);

      if (idsToAdd.length === 0) {
        return res.status(400).json({ message: "No lead IDs provided" });
      }

      const results = [];
      for (const id of idsToAdd) {
        try {
          const mapping = await storage.addStudentToClass(classId, id);
          results.push(mapping);
        } catch (err: any) {
          console.error(`Error adding lead ${id} to class ${classId}:`, err.message);
          // Continue with other leads even if one fails
        }
      }

      res.status(201).json({ added: results.length, mappings: results });
    } catch (error: any) {
      res.status(500).json({ message: "Error adding student to class", error: error.message });
    }
  });


  app.delete("/api/classes/:classId/students/:leadId", isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const leadId = parseInt(req.params.leadId);
      await storage.removeStudentFromClass(classId, leadId);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ message: "Error removing student from class", error: error.message });
    }
  });

  app.get('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const leadId = parseInt(id);

      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      const lead = await storage.getLead(leadId);

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.put('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const userRole = currentUser?.role || 'hr';
      const { id } = req.params;
      console.log('🔵 PUT /api/leads/:id received', { leadId: id, userId, userRole, bodyKeys: Object.keys(req.body) });

      // Validate request body based on user role
      const baseUpdateSchema = z.object({
        // Basic information - HR users can now edit these
        name: z.string().min(1, "Name is required").optional(),
        email: z.string().email("Valid email is required").optional(),
        phone: z.string().optional().or(z.literal("")),
        location: z.string().optional().or(z.literal("")),
        degree: z.string().optional().or(z.literal("")),
        status: z.enum(['new', 'register', 'scheduled', 'completed', 'not_interested', 'pending', 'ready_for_class', 'not_available', 'no_show', 'reschedule', 'pending_but_ready', 'wrong_number', 'not_picking', 'call_back']).optional(),
        notes: z.string().optional(),
        changeReason: z.string().optional(),
        // Scheduling information - HR can now save walk-in date and time
        walkinDate: z.string().optional().or(z.literal("")),
        walkinTime: z.string().optional().or(z.literal("")),
        timing: z.string().optional().or(z.literal("")),
        // Dynamic fields from bulk import - HR can edit these
        yearOfPassing: z.string().optional().or(z.literal("")),
        collegeName: z.string().optional().or(z.literal("")),
        // HR workflow fields
        registrationAmount: z.string().optional().or(z.literal("")),
        pendingAmount: z.string().optional().or(z.literal("")),
        partialAmount: z.string().optional().or(z.literal("")),
        domain: z.string().optional().or(z.literal("")),
        sessionDays: z.enum(["M,W,F", "T,T,S", "daily", "weekend", "custom"]).optional().or(z.literal("")),
        // Accounts workflow fields
        transactionNumber: z.string().optional().or(z.literal("")),
        concession: z.string().optional().or(z.literal(""))
      });

      // Managers and admins can update all fields
      const managerUpdateSchema = baseUpdateSchema.extend({
        name: z.string().min(1, "Name is required").optional(),
        email: z.string().email("Valid email is required").optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
        degree: z.string().optional(),
        domain: z.string().optional(),
        sessionDays: z.enum(["M,W,F", "T,T,S", "daily", "weekend", "custom"]).optional().or(z.literal("")),
        timing: z.string().optional(),
        walkinDate: z.string().optional(),
        walkinTime: z.string().optional()
      });

      const updateLeadSchema = (userRole === 'manager' || userRole === 'admin') ? managerUpdateSchema : baseUpdateSchema;

      const validation = updateLeadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: validation.error.errors
        });
      }

      const updates = validation.data;

      // Parse registrationAmount from string to decimal (null for empty)
      if (updates.registrationAmount !== undefined) {
        if (updates.registrationAmount === "" || updates.registrationAmount === null) {
          updates.registrationAmount = null as any;
        } else {
          const parsed = parseFloat(updates.registrationAmount);
          if (isNaN(parsed)) {
            return res.status(400).json({ message: "Invalid registration amount format" });
          }
          updates.registrationAmount = parsed.toString() as any; // Store as string for Drizzle decimal handling
        }
      }

      // Parse pendingAmount from string to decimal (null for empty)
      if (updates.pendingAmount !== undefined) {
        if (updates.pendingAmount === "" || updates.pendingAmount === null) {
          updates.pendingAmount = null as any;
        } else {
          const parsed = parseFloat(updates.pendingAmount);
          if (isNaN(parsed)) {
            return res.status(400).json({ message: "Invalid pending amount format" });
          }
          updates.pendingAmount = parsed.toString() as any; // Store as string for Drizzle decimal handling
        }
      }

      // Parse partialAmount from string to decimal (null for empty)
      if (updates.partialAmount !== undefined) {
        if (updates.partialAmount === "" || updates.partialAmount === null) {
          updates.partialAmount = null as any;
        } else {
          const parsed = parseFloat(updates.partialAmount);
          if (isNaN(parsed)) {
            return res.status(400).json({ message: "Invalid partial amount format" });
          }
          updates.partialAmount = parsed.toString() as any; // Store as string for Drizzle decimal handling
        }
      }

      // Parse concession from string to decimal (null for empty)
      if (updates.concession !== undefined) {
        if (updates.concession === "" || updates.concession === null) {
          updates.concession = null as any;
        } else {
          const parsed = parseFloat(updates.concession);
          if (isNaN(parsed)) {
            return res.status(400).json({ message: "Invalid concession format" });
          }
          updates.concession = parsed.toString() as any; // Store as string for Drizzle decimal handling
        }
      }

      const leadId = parseInt(id);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      const currentLead = await storage.getLead(leadId);
      if (!currentLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Role-based access control
      // Managers and admins can edit any lead
      // HR and Accounts users can edit leads assigned to them OR leads they have previously completed/owned
      let hasAccess = (userRole === 'manager' || userRole === 'admin');

      if (!hasAccess) {
        // Check if currently assigned
        if (currentLead.currentOwnerId === userId) {
          hasAccess = true;
        } else {
          // Check if previously owned/completed by this user
          const historicalAccess = await db
            .select({ id: leadHistory.id })
            .from(leadHistory)
            .where(and(
              eq(leadHistory.leadId, leadId),
              or(
                eq(leadHistory.fromUserId, userId),
                eq(leadHistory.toUserId, userId)
              )
            ))
            .limit(1);

          if (historicalAccess.length > 0) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied: You do not have permission to edit this lead" });
      }

      const lead = await storage.updateLead(leadId, updates);

      // Create history entry for status changes
      if (updates.status && updates.status !== currentLead.status) {
        await storage.createLeadHistory({
          leadId: leadId,
          fromUserId: currentLead.currentOwnerId,
          toUserId: currentLead.currentOwnerId,
          previousStatus: currentLead.status,
          newStatus: updates.status,
          changeReason: updates.changeReason || 'Status updated',
          changeData: JSON.stringify({ updates }),
          changedByUserId: userId
        });


        console.log(`[Lead Update] Created history entry: leadId=${leadId}, changedByUserId=${userId}, newStatus=${updates.status}`);

        // Auto-transfer to Accounts when HR marks lead as 'completed'
        if (updates.status === 'completed' && req.user.role === 'hr') {
          // Find an accounts user to assign the lead to
          const accountsUsers = await storage.getUsersByRole('accounts');

          if (accountsUsers && accountsUsers.length > 0) {
            // Assign to the first available accounts user (or implement load balancing)
            const accountsUser = accountsUsers[0];

            // Update the lead's owner to the accounts user and set status to 'pending'
            await storage.updateLead(leadId, {
              currentOwnerId: accountsUser.id,
              status: 'pending'
            });

            // Create history entry for the assignment and status change
            await storage.createLeadHistory({
              leadId: leadId,
              fromUserId: currentLead.currentOwnerId,
              toUserId: accountsUser.id,
              previousStatus: updates.status,
              newStatus: 'pending',
              changeReason: 'Auto-assigned to Accounts team (Status: Pending)',
              changeData: JSON.stringify({
                action: 'auto_transfer_to_accounts',
                createdBy: userId,
                createdAt: new Date().toISOString()
              }),
              changedByUserId: userId
            });

            console.log(`[Auto-Transfer] Lead ${leadId} assigned to Accounts user ${accountsUser.id} (${accountsUser.email})`);
          }
        }

      } else {
        // Create history entry for non-status field changes (for manager/admin edits)
        const changedFields = [];
        const nonStatusFields = ['name', 'email', 'phone', 'location', 'degree', 'domain', 'sessionDays', 'timing', 'walkinDate', 'walkinTime', 'notes', 'transactionNumber', 'partialAmount', 'concession'];

        for (const field of nonStatusFields) {
          const updateValue = (updates as any)[field];
          const currentValue = (currentLead as any)[field];
          if (updateValue !== undefined && updateValue !== currentValue) {
            changedFields.push({
              field,
              oldValue: currentValue,
              newValue: updateValue
            });
          }
        }

        if (changedFields.length > 0) {
          await storage.createLeadHistory({
            leadId: leadId,
            fromUserId: currentLead.currentOwnerId,
            toUserId: currentLead.currentOwnerId,
            previousStatus: currentLead.status,
            newStatus: currentLead.status,
            changeReason: updates.changeReason || 'Lead information updated',
            changeData: JSON.stringify({ changedFields, updates }),
            changedByUserId: userId
          });
        }
      }


      // Get final lead state for accurate broadcast
      const finalLead = await storage.getLead(leadId);

      // Broadcast real-time update with role-based filtering - include complete lead object
      if (typeof (global as any).broadcastUpdate === 'function' && finalLead) {
        (global as any).broadcastUpdate('lead_updated', {
          ...finalLead,
          updatedBy: userId
        }, {
          roles: ['hr', 'accounts', 'admin', 'manager'] // Only authenticated roles
        });
      }

      res.json(finalLead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // Lead deletion route
  app.delete('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const userRole = currentUser?.role || 'hr';
      const { id } = req.params;

      const leadId = parseInt(id);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      const currentLead = await storage.getLead(leadId);
      if (!currentLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Role-based access control
      // Managers and admins can delete any lead
      // HR users can only delete their own assigned leads
      if (userRole === 'hr' && currentLead.currentOwnerId !== userId) {
        return res.status(403).json({ message: "Access denied: You can only delete your own leads" });
      }

      if (userRole === 'accounts') {
        return res.status(403).json({ message: "Access denied: Accounts users cannot delete leads" });
      }

      // Different behavior based on user role:
      // HR users: Unassign lead (soft delete) - lead goes back to Lead Management
      // Managers/Admins: Hard delete lead permanently
      if (userRole === 'hr' && currentLead.currentOwnerId === userId) {
        // HR user deleting their own lead - unassign it instead of deleting
        await storage.unassignLeadWithHistory(leadId, {
          fromUserId: currentLead.currentOwnerId,
          toUserId: null,
          previousStatus: currentLead.status,
          newStatus: 'new', // Reset to new status for reassignment
          changeReason: 'Lead released by HR - returned to Lead Management',
          changeData: {
            action: 'unassigned',
            previousOwner: currentLead.currentOwnerId,
            releasedBy: userId,
            releasedAt: new Date()
          },
          changedByUserId: userId
        });

        // Broadcast real-time update for lead unassignment
        if (typeof (global as any).broadcastUpdate === 'function') {
          (global as any).broadcastUpdate('lead_unassigned', {
            id: leadId,
            name: currentLead.name,
            releasedBy: userId
          }, {
            roles: ['hr', 'accounts', 'admin', 'manager'] // Only authenticated roles
          });
        }

        res.json({ success: true, message: "Lead returned to Lead Management for reassignment" });
      } else {
        // Manager/Admin hard delete
        await storage.deleteLeadWithHistory(leadId, {
          fromUserId: currentLead.currentOwnerId,
          toUserId: null,
          previousStatus: currentLead.status,
          newStatus: currentLead.status, // Keep original status for audit trail
          changeReason: 'Lead deleted',
          changeData: {
            action: 'deleted',
            deletedLead: currentLead,
            deletedBy: userId,
            deletedAt: new Date()
          },
          changedByUserId: userId
        });

        // Broadcast real-time update for lead deletion
        if (typeof (global as any).broadcastUpdate === 'function') {
          (global as any).broadcastUpdate('lead_deleted', {
            id: leadId,
            name: currentLead.name,
            deletedBy: userId
          }, {
            roles: ['hr', 'accounts', 'admin', 'manager'] // Only authenticated roles
          });
        }

        res.json({ success: true, message: "Lead deleted successfully" });
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Pass lead to accounts endpoint
  app.post('/api/leads/:id/pass-to-accounts', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;

    try {
      const { id } = req.params;
      const leadId = parseInt(id);

      if (!leadId || isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }


      // Get the lead
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Validate required fields from request body

      const requiredFields = ['name', 'email', 'phone', 'walkinDate', 'walkinTime', 'registrationAmount'];
      const missingFields = requiredFields.filter(field => {

        const value = req.body[field];
        return !value || value === '';
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: "Missing required fields for passing to accounts",
          missingFields: missingFields
        });
      }


      // Update the lead with all provided data and set status to accounts_pending
      const updatedLead = await storage.updateLead(leadId, {
        ...req.body,
        walkinDate: req.body.walkinDate ? new Date(req.body.walkinDate) : lead.walkinDate,
        walkinTime: req.body.walkinTime || lead.walkinTime,
        registrationAmount: req.body.registrationAmount ? parseFloat(req.body.registrationAmount) : lead.registrationAmount,
        status: 'accounts_pending', // Set status so it disappears from HR's My Leads
        updatedAt: new Date()
      });

      // Create history entry
      await storage.createLeadHistory({
        leadId: leadId,
        fromUserId: userId,
        previousStatus: lead.status,
        newStatus: 'accounts_pending',
        changeReason: "Passed to Accounts Team",
        changeData: JSON.stringify({
          action: "pass_to_accounts",
          fields_updated: {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            location: req.body.location,
            walkinDate: req.body.walkinDate,
            walkinTime: req.body.walkinTime,
            registrationAmount: req.body.registrationAmount
          }
        }),
        changedByUserId: userId
      });


      // Broadcast real-time update
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('lead_passed_to_accounts', {
          id: leadId,
          name: updatedLead.name,
          email: updatedLead.email,
          passedBy: userId
        }, {
          roles: ['hr', 'accounts', 'admin', 'manager']
        });
      }

      res.json({ success: true, message: "Lead passed to accounts team successfully", data: updatedLead });
    } catch (error) {
      console.error("Error passing lead to accounts:", error);
      res.status(500).json({ message: "Failed to pass lead to accounts" });
    }
  });

  // Lead assignment routes
  app.post('/api/leads/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const leadId = parseInt(id);
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const userRole = currentUser.role;

      if (!leadId || isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      // Validate request body
      const assignLeadSchema = z.object({
        toUserId: z.string().optional(),
        reason: z.string().max(256).optional()
      });

      const validation = assignLeadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: validation.error.errors
        });
      }

      const { toUserId, reason } = validation.data;

      // Default to current user if no toUserId provided
      const targetUserId = toUserId || userId;

      // Validate target user exists and is valid for the assignment
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(400).json({ message: "Target user not found" });
      }

      // Role-based authorization
      if (userRole === 'hr') {
        // HR can only assign leads to themselves and only if the lead is unassigned
        if (targetUserId !== userId) {
          return res.status(403).json({ message: "HR users can only assign leads to themselves" });
        }

        const existingLead = await storage.getLead(leadId);
        if (!existingLead) {
          return res.status(404).json({ message: "Lead not found" });
        }

        if (existingLead.currentOwnerId) {
          return res.status(409).json({ message: "Lead is already assigned" });
        }
      } else if (userRole === 'manager' || userRole === 'admin') {
        // Managers and admins can reassign to any HR user
        if (targetUser.role !== 'hr' && targetUserId !== userId) {
          return res.status(400).json({ message: "Can only assign leads to HR users" });
        }
      } else {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Use atomic assignment with concurrency protection
      let updatedLead;
      try {
        updatedLead = await storage.assignLead(leadId, targetUserId, userId, reason);
      } catch (error: any) {
        if (error.message.includes('Lead not found')) {
          return res.status(404).json({ message: "Lead not found" });
        }
        if (error.message.includes('already assigned')) {
          return res.status(409).json({ message: "Lead is already assigned to another user" });
        }
        throw error;
      }

      // Broadcast assignment to relevant users
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('lead_assigned', {
          leadId,
          assignedTo: targetUserId,
          assignedBy: userId,
          lead: updatedLead
        }, {
          userIds: [targetUserId] // Notify the user who got the lead
        });
      }

      res.json({ success: true, lead: updatedLead });
    } catch (error) {
      console.error("Error assigning lead:", error);
      res.status(500).json({ message: "Failed to assign lead" });
    }
  });

  // Get leads by category for HR users


  // Get team lead info for HR users
  app.get('/api/my/team-lead', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);

      if (!currentUser || currentUser.role !== 'hr') {
        return res.status(403).json({ message: "Only HR users can access this endpoint" });
      }

      if (!currentUser.teamLeadId) {
        return res.status(404).json({ message: "No team lead assigned" });
      }

      const teamLead = await storage.getUser(currentUser.teamLeadId);
      if (!teamLead) {
        return res.status(404).json({ message: "Team lead not found" });
      }

      res.json({
        id: teamLead.id,
        fullName: teamLead.fullName,
        email: teamLead.email,
        teamName: teamLead.teamName
      });
    } catch (error) {
      console.error("Error fetching team lead:", error);
      res.status(500).json({ message: "Failed to fetch team lead" });
    }
  });

  // Get team stats for team lead users
  app.get('/api/my/team-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);

      if (!currentUser || currentUser.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Team Leads can access this endpoint" });
      }

      // Get all HR users assigned to this team lead
      const allHrUsers = await storage.getUsersByRole('hr');
      const teamMembers = allHrUsers.filter((u: any) => u.teamLeadId === userId);

      // Get stats for each team member
      const memberStats = await Promise.all(teamMembers.map(async (member: any) => {
        const memberLeads = await storage.searchLeads({ ownerId: member.id, limit: 1000 });
        const completedLeads = await storage.searchLeads({
          previousOwnerId: member.id,
          status: 'completed',
          limit: 1000
        });

        return {
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          isActive: member.isActive,
          totalLeads: memberLeads.total,
          completedLeads: completedLeads.total
        };
      }));

      res.json({
        teamName: currentUser.teamName,
        totalMembers: teamMembers.length,
        members: memberStats,
        totalLeads: memberStats.reduce((sum, m) => sum + m.totalLeads, 0),
        totalCompleted: memberStats.reduce((sum, m) => sum + m.completedLeads, 0)
      });
    } catch (error) {
      console.error("Error fetching team stats:", error);
      res.status(500).json({ message: "Failed to fetch team stats" });
    }
  });

  // NEW: Comprehensive Team Lead Dashboard endpoint
  app.get('/api/team-lead/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;

      console.log(`[Team Lead Dashboard] User ${userId} (${userRole}) requesting dashboard`);

      if (userRole !== 'team_lead') {
        return res.status(403).json({ message: "Only Team Leads can access this endpoint" });
      }

      // Fetch team lead user details
      const teamLead = await storage.getUser(userId);
      if (!teamLead) {
        return res.status(404).json({ message: "Team lead not found" });
      }

      // Fetch all HR users and filter for this team lead's team
      const allHrUsers = await storage.getUsersByRole('hr');
      const teamMembers = allHrUsers.filter((u: any) => u.teamLeadId === userId);
      console.log(`[Team Lead Dashboard] Found ${teamMembers.length} team members`);

      // Fetch all leads for all team members with detailed stats
      const teamMemberStats = [];
      const allTeamLeads: any[] = [];

      for (const member of teamMembers) {
        // Get all leads for this team member
        const memberLeadsResult = await storage.searchLeads({
          ownerId: member.id,
          limit: 10000,
          page: 1
        });
        const memberLeads = memberLeadsResult.leads || [];

        // Calculate stats
        const totalLeads = memberLeads.length;
        const completedLeads = memberLeads.filter((l: any) =>
          l.status === 'completed' || l.status === 'ready_for_class' || l.status === 'accounts_pending'
        ).length;
        const pendingLeads = totalLeads - completedLeads;
        const completionRate = totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;

        teamMemberStats.push({
          id: member.id,
          name: member.fullName || member.email,
          email: member.email,
          totalLeads,
          completedLeads,
          pendingLeads,
          completionRate
        });

        // Add all leads to the comprehensive list
        memberLeads.forEach((lead: any) => {
          allTeamLeads.push({
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            status: lead.status,
            assignedTo: member.fullName || member.email,
            assignedToId: member.id,
            createdAt: lead.createdAt,
            walkinDate: lead.walkinDate,
            location: lead.location,
            category: lead.category
          });
        });
      }

      // Calculate overall team stats
      const totalMembers = teamMembers.length;
      const totalLeads = allTeamLeads.length;
      const completedLeads = allTeamLeads.filter((l: any) =>
        l.status === 'completed' || l.status === 'ready_for_class' || l.status === 'accounts_pending'
      ).length;
      const overallCompletionRate = totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;

      res.json({
        teamLeadName: teamLead.fullName || teamLead.email,
        teamName: teamLead.teamName,
        totalMembers,
        totalLeads,
        completedLeads,
        completionRate: overallCompletionRate,
        teamMembers: teamMemberStats,
        allLeads: allTeamLeads
      });

    } catch (error: any) {
      console.error('[Team Lead Dashboard] Error:', error);
      console.error('[Team Lead Dashboard] Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to fetch team lead dashboard', error: error.message });
    }
  });

  // My leads route for HR and accounts users
  app.get('/api/my/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role; // Use role from auth middleware

      console.log(`[/api/my/leads] User ${userId} with role '${userRole}' requesting leads`);

      // HR, accounts, tech-support and management roles can access
      if (!['hr', 'accounts', 'manager', 'admin', 'tech-support'].includes(userRole as any)) {
        console.log(`[/api/my/leads] Access denied for role: ${userRole}`);
        return res.status(403).json({ message: "Access denied - insufficient permissions for this role" });
      }

      const { status, search, page = 1, limit = 20, category, adminSubRole } = req.query;

      const filters: any = {
        status: status as string,
        search: search as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      };

      const querySubRole = req.query.adminSubRole;
      const isSessionOrg = userRole === 'session_organizer' ||
        (userRole === 'admin' && (adminSubRole === 'session_organizer' || querySubRole === 'session_organizer' || String(querySubRole) === 'session_organizer'));

      console.log(`[/api/my/leads] HARDENED CHECK: userRole: ${userRole}, isSessionOrg: ${isSessionOrg}, querySubRole: ${querySubRole}`);

      // Different filtering logic based on role
      if (userRole === 'accounts') {
        // Accounts users should see ALL leads with accounts_pending or ready_for_class status
        // These are leads completed by HR and ready for Accounts processing
        // Do NOT filter by accountsId - show ALL leads with these statuses
        if (!status) {
          filters.accountsStatuses = ['accounts_pending', 'ready_for_class', 'completed'];
        }
        console.log(`[/api/my/leads] Accounts user filters:`, JSON.stringify(filters));
        // Remove excludeCompleted to show completed leads too
      } else if (isSessionOrg) {
        // Session organizers see leads that are ready_for_class or scheduled
        if (status === 'scheduled') {
          filters.statuses = ['scheduled'];
        } else if (status === 'ready_for_class') {
          filters.statuses = ['ready_for_class'];
        } else {
          // Default to ready_for_class if no valid status provided
          filters.statuses = ['ready_for_class'];
        }
        console.log(`[/api/my/leads] Session Organizer filters fully applied (status: ${status}):`, JSON.stringify(filters));
      } else if (userRole === 'manager' || userRole === 'admin') {
        // Managers/Admins see all leads except completed ones
        filters.excludeCompleted = true;
      } else {
        // HR users see their assigned leads, excluding completed and accounts_pending
        filters.ownerId = userId;
        filters.excludeCompleted = true;
        filters.excludeAccountsPending = true;
      }

      if (category) {
        filters.category = category as string;
      }

      const result = await storage.searchLeads(filters);
      console.log(`[/api/my/leads] Result for ${userRole}: ${result.leads?.length || 0} leads, total: ${result.total}`);
      res.json(result);
    } catch (error) {
      console.error("Error fetching my leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // Endpoint for accounts pending leads (leads passed to accounts)
  app.get('/api/my/accounts-pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);

      if (!currentUser || currentUser.role !== 'accounts') {
        return res.status(403).json({ message: "This endpoint is for accounts users only" });
      }

      const { search, page = 1, limit = 20, category } = req.query;

      // Accounts users see leads with accounts_pending status
      const filters: any = {
        status: 'accounts_pending',
        search: search as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      };

      if (category) {
        filters.category = category as string;
      }

      const result = await storage.searchLeads(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching accounts pending leads:", error);
      res.status(500).json({ message: "Failed to fetch accounts pending leads" });
    }
  });

  // New endpoint for HR user's completed leads
  app.get('/api/my/completed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role; // Use role from auth middleware

      // Only HR, Accounts, Admin users and managers can access completed leads
      if (!['hr', 'accounts', 'admin', 'manager'].includes(userRole)) {
        return res.status(403).json({ message: "This endpoint is for HR, Accounts, Admin users and managers only" });
      }

      const { search, page = 1, limit = 20, category } = req.query;

      const filters: any = {
        search: search as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        includeHistory: true // Include lead history for detailed view
      };

      // Role-based filtering:
      // - HR users: see leads they personally completed (including accounts_pending)
      // - Accounts users: see ONLY leads they marked as complete (exclude accounts_pending)
      // - Managers and Admins: see all completed leads, can filter by category
      if (userRole === 'hr') {
        filters.previousOwnerId = userId; // HR sees only their own completed leads
        // HR users: apply category filter to show only their selected category
        if (category) {
          filters.category = category as string;
        }
      } else if (userRole === 'accounts') {
        filters.previousOwnerId = userId; // Accounts sees only their own completed leads
        filters.excludeAccountsPending = true; // IMPORTANT: Exclude accounts_pending from completion
        // Accounts users: apply category filter to show only their selected category
        if (category) {
          filters.category = category as string;
        }
      } else if (userRole === 'manager' || userRole === 'admin') {
        // Manager and Admin see all completed leads
        filters.showAllCompleted = true; // Special flag for managers and admins
        // Apply category filter if selected
        if (category) {
          filters.category = category as string;
        }
      }

      const result = await storage.searchLeads(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching completed leads:", error);
      res.status(500).json({ message: "Failed to fetch completed leads" });
    }
  });

  // Get all lead history for dashboard metrics
  app.get('/api/history/all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const currentUser = await storage.getUser(userId);
      const userRole = currentUser?.role;

      // Allow all authenticated users to see lead history for metrics
      if (!['admin', 'manager', 'hr', 'accounts', 'tech-support'].includes(userRole as string)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const allHistory = await storage.getAllLeadHistory();
      res.json(allHistory);
    } catch (error) {
      console.error("Error fetching all lead history:", error);
      res.status(500).json({ message: "Failed to fetch lead history" });
    }
  });

  // Lead history routes
  app.get('/api/leads/:id/history', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const currentUser = await storage.getUser(userId);
      const userRole = currentUser?.role;

      // Get the lead to check ownership and access
      const lead = await storage.getLead(parseInt(id));
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Defensive check for valid roles
      if (!userRole || !['admin', 'manager', 'hr', 'accounts'].includes(userRole)) {
        return res.status(403).json({ message: "Access denied - invalid role" });
      }

      // Role-based access control for lead history
      if (userRole === 'admin' || userRole === 'manager') {
        // Admin and Manager have full access
      } else if (userRole === 'hr') {
        if (lead.currentOwnerId !== userId) {
          return res.status(403).json({ message: "Access denied - you can only view history for your assigned leads" });
        }
      } else if (userRole === 'accounts') {
        if (lead.currentOwnerId !== userId && lead.status !== 'pending') {
          return res.status(403).json({ message: "Access denied - you can only view history for your assigned leads or pending leads" });
        }
      } else {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      const history = await storage.getLeadHistory(parseInt(id));
      res.json(history);
    } catch (error) {
      console.error("Error fetching lead history:", error);
      res.status(500).json({ message: "Failed to fetch lead history" });
    }
  });

  // Individual lead creation - HR users can create leads and become the owner
  app.post('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const userRole = currentUser?.role;

      // Only HR users can create individual leads
      if (userRole !== 'hr') {
        return res.status(403).json({ message: "Only HR users can create individual leads" });
      }

      // Validate request body
      const validation = insertLeadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: validation.error.errors
        });
      }

      const leadData = validation.data;

      // Create the lead with the HR user as the owner
      const newLead = await storage.createLead({
        ...leadData,
        currentOwnerId: userId, // HR user who creates the lead becomes the owner
        sourceManagerId: userId, // Track who originally created this lead
        status: 'new',
        isActive: true
      });

      // Create initial history entry
      await storage.createLeadHistory({
        leadId: newLead.id,
        fromUserId: null,
        toUserId: userId,
        previousStatus: null,
        newStatus: 'new',
        changeReason: 'Lead created',
        changeData: JSON.stringify({
          action: 'created',
          createdBy: userId,
          createdAt: new Date().toISOString()
        }),
        changedByUserId: userId
      });

      // Broadcast lead creation to relevant users
      if (typeof (global as any).broadcastUpdate === 'function' && currentUser) {
        (global as any).broadcastUpdate('lead_created', {
          id: newLead.id,
          name: newLead.name,
          email: newLead.email,
          currentOwner: currentUser.fullName,
          createdBy: userId
        }, {
          roles: ['manager', 'admin', 'hr'] // Broadcast to managers, admins, and HR
        });
      }

      res.status(201).json(newLead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // Bulk upload routes
  app.post('/api/upload-leads', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Read category and allocationStrategy from query parameters
      const uploadCategory = req.query.category || 'Client Hiring';
      const allocationStrategy = req.query.allocationStrategy || 'round-robin';

      // Handle hardcoded manager
      let userRole = 'hr';
      let actualUserId = userId;

      if (userId === 'hardcoded-manager-id') {
        userRole = 'manager';
        // For hardcoded manager, look up the actual manager user from database
        const managerUser = await storage.getUserByEmail(process.env.MANAGER_EMAIL || 'vcodezmanager@gmail.com');
        if (managerUser) {
          actualUserId = managerUser.id;
        } else {
          return res.status(500).json({ message: "Manager user not found in database" });
        }
      } else {
        const currentUser = await storage.getUser(userId);
        userRole = currentUser?.role || 'hr';
      }

      if (userRole !== 'manager' && userRole !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Note: All imported leads go to Lead Management (unassigned) for HR to pick up

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      // Create upload record
      const upload = await storage.createUpload({
        uploaderId: actualUserId,
        fileName: req.file.originalname,
        rowCount: data.length,
        processedCount: 0,
        failedCount: 0,
        status: 'processing'
      });

      // Validate and process leads

      let processedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];
      const leadsToInsert: any[] = [];

      // OPTIMIZATION: Batch check all emails at once before processing rows
      console.log(`Batch checking ${data.length} emails for duplicates...`);
      const allEmails = data.map((row: any) => row.email).filter(Boolean);
      const existingEmails = await storage.checkEmailExistsBatch(allEmails);
      console.log(`Found ${existingEmails.size} existing emails in database`);

      const seenEmails = new Set<string>();

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const rowData = row as any;

          // Check if email already exists using the batch result
          if (rowData.email) {
            const emailLower = rowData.email.trim().toLowerCase();

            // Check if email exists in database
            if (existingEmails.has(emailLower)) {
              skippedCount++;
              errors.push({
                row: i + 1,
                error: `Email ${rowData.email} already exists in database - skipped duplicate`,
                type: 'duplicate_email'
              });
              continue; // Skip this row
            }

            // Check if email exists multiple times in the uploaded file
            if (seenEmails.has(emailLower)) {
              skippedCount++;
              errors.push({
                row: i + 1,
                error: `Email ${rowData.email} appears multiple times in upload - skipped duplicate`,
                type: 'duplicate_email_in_file'
              });
              continue; // Skip this row
            }

            seenEmails.add(emailLower);
          }

          // Helper function to handle sessionDays conversion
          const parseSessionDays = (value: any) => {
            if (value === null || value === undefined || value === '') {
              return null; // Schema now accepts null values
            }

            // If it's already a valid string enum, return it
            const validEnums = ["M,W,F", "T,T,S", "daily", "weekend", "custom"];
            if (typeof value === 'string' && validEnums.includes(value)) {
              return value;
            }

            // Handle common integer mappings to string enums
            const numValue = parseInt(String(value));
            if (!isNaN(numValue)) {
              switch (numValue) {
                case 1: return "M,W,F";
                case 2: return "T,T,S";
                case 3: return "daily";
                case 4: return "weekend";
                case 5: return "custom";
                default: return null; // Invalid number, use null
              }
            }

            // If it's a string but not a valid enum, return null
            return null;
          };

          // Helper function to get value from rowData with flexible column name matching
          const getColumnValue = (rowData: any, ...possibleNames: string[]) => {
            // Try exact match first
            for (const name of possibleNames) {
              if (name in rowData && rowData[name] != null && rowData[name] !== '') {
                return rowData[name];
              }
            }

            // Try case-insensitive match with space/underscore flexibility
            const keys = Object.keys(rowData);
            const normalizedPossibleNames = possibleNames.map(n =>
              n.toLowerCase().replace(/[_\s]/g, '')
            );

            for (const key of keys) {
              const normalizedKey = key.toLowerCase().replace(/[_\s]/g, '');
              if (normalizedPossibleNames.includes(normalizedKey)) {
                if (rowData[key] != null && rowData[key] !== '') {
                  return rowData[key];
                }
              }
            }

            return null;
          };

          const leadData: any = {
            name: rowData.name || getColumnValue(rowData, 'name', 'Name', 'Full Name', 'Fullname'),
            email: rowData.email || getColumnValue(rowData, 'email', 'Email', 'E-mail'),
            phone: rowData.phone != null ? String(rowData.phone) : getColumnValue(rowData, 'phone', 'Phone', 'Mobile', 'Contact'),
            location: rowData.location || getColumnValue(rowData, 'location', 'Location', 'City', 'Address'),
            degree: rowData.degree || getColumnValue(rowData, 'degree', 'Degree', 'Qualification', 'Education'),
            domain: rowData.domain || getColumnValue(rowData, 'domain', 'Domain', 'Field', 'Subject'),
            sessionDays: parseSessionDays(rowData.session_days || getColumnValue(rowData, 'session_days', 'sessionDays', 'Session Days')),
            sourceManagerId: actualUserId,
            status: 'new',
            isActive: true,
            category: uploadCategory
          };

          // Handle additional dynamic columns explicitly
          const yearOfPassing = getColumnValue(rowData, 'year_of_passing', 'yearOfPassing', 'Year of Passing', 'YearOfPassing', 'Passing Year');
          if (yearOfPassing) {
            leadData.yearOfPassing = String(yearOfPassing);
          }

          const collegeName = getColumnValue(rowData, 'college_name', 'collegeName', 'College Name', 'CollegeName', 'College');
          if (collegeName) {
            leadData.collegeName = String(collegeName);
          }

          const notes = getColumnValue(rowData, 'notes', 'Notes', 'Comment', 'Comments');
          if (notes) {
            leadData.notes = String(notes);
          }

          // Always leave imported leads unassigned so they appear in Lead Management
          // HR users can pick them up from there instead of having them auto-assigned
          leadData.currentOwnerId = null;

          const validatedLead = insertLeadSchema.parse(leadData);
          leadsToInsert.push(validatedLead);
          processedCount++;
        } catch (error) {
          failedCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ row: i + 1, error: errorMessage, type: 'validation_error' });
        }
      }

      if (leadsToInsert.length > 0) {
        console.log(`Processing ${leadsToInsert.length} valid leads for bulk insert`);
        await storage.createLeadsBulk(leadsToInsert);
        console.log(`Bulk insert of ${leadsToInsert.length} leads finished`);
      } else {
        console.log("No valid leads to insert");
      }

      // Update upload record with total failed count (validation errors + skipped duplicates)
      await storage.updateUpload(upload.id, {
        processedCount,
        failedCount: failedCount + skippedCount, // Include skipped duplicates in failed count
        status: 'completed',
        errors: JSON.stringify(errors)
      });

      // Broadcast bulk upload completion to HR and managers
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('bulk_upload_completed', {
          count: processedCount,
          failed: failedCount,
          skipped: skippedCount,
          uploadedBy: actualUserId,
          fileName: req.file.originalname
        }, {
          roles: ['hr', 'manager', 'admin'] // Only relevant roles for bulk uploads
        });
      }

      res.json({
        uploadId: upload.id,
        totalRows: data.length,
        processedCount,
        failedCount,
        skippedCount,
        errors
      });
    } catch (error) {
      console.error("Error processing upload:", error);
      res.status(500).json({ message: "Failed to process upload" });
    }
  });

  // Tech support dashboard routes

  app.get('/api/tech-support/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || (user.role !== 'tech-support' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Forbidden: Tech support access only" });
      }

      const metrics = await storage.getTechSupportMetrics(user.claims.email);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching tech support dashboard:", error);
      res.status(500).json({ message: "Failed to fetch tech support dashboard" });
    }
  });

  // Export routes
  app.get('/api/export', isAuthenticated, async (req: any, res) => {
    try {
      // Set no-cache headers to ensure fresh data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const userId = req.user.claims.sub;

      // Handle hardcoded manager
      let userRole = 'hr';
      if (userId === 'hardcoded-manager-id') {
        userRole = 'manager';
      } else {
        const currentUser = await storage.getUser(userId);
        userRole = currentUser?.role || 'hr';
      }

      if (userRole !== 'manager' && userRole !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions to delete lead" });
      }

      const { status, hrId, accountsId, fromDate, toDate, format = 'csv' } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (hrId) filters.ownerId = hrId;
      if (accountsId) filters.accountsId = accountsId;
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;

      // Get fresh data directly from database with timestamp
      const exportTimestamp = new Date().toISOString();

      // Get all leads without pagination to ensure complete export
      const leadsWithUsers = await storage.getLeadsWithUserInfo({
        ...filters,
        limit: 100000  // Get all records, not just 10000
      });

      // Create comprehensive export data with current timestamp
      const TOTAL_AMOUNT = 7000;
      const exportData = leadsWithUsers.map(lead => {
        // Ensure values are parsed correctly as decimals
        const regAmount = (lead.registrationAmount ? parseFloat(String(lead.registrationAmount)) : 0) || 0;
        const concessionAmount = (lead.concession ? parseFloat(String(lead.concession)) : 0) || 0;
        const partAmount = (lead.partialAmount ? parseFloat(String(lead.partialAmount)) : 0) || 0;
        const pendingAmount = TOTAL_AMOUNT - (regAmount + concessionAmount + partAmount);
        const collectedAmount = regAmount + partAmount;

        // Format walk-in date properly
        const walkinDateFormatted = lead.walkinDate
          ? new Date(lead.walkinDate).toLocaleDateString('en-IN')
          : '—';

        return {
          // Basic Information
          name: lead.name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          location: lead.location || '',
          degree: lead.degree || '',
          domain: lead.domain || '',

          // Walk-in Information (ensure these are included)
          'Walk-in Date': walkinDateFormatted,
          'Walk-in Time': lead.walkinTime || '—',
          'Session Days': lead.sessionDays || '',
          'Timing': lead.timing || '—',

          // Financial Information (ensure calculations are correct)
          'Registration Amount': regAmount > 0 ? `₹${regAmount.toFixed(2)}` : '—',
          'Partial Amount': partAmount > 0 ? `₹${partAmount.toFixed(2)}` : '—',
          'Concession': concessionAmount > 0 ? `₹${concessionAmount.toFixed(2)}` : '—',
          'Pending Amount': `₹${Math.max(0, pendingAmount).toFixed(2)}`,
          'Collected Amount': `₹${collectedAmount.toFixed(2)}`,
          'Transaction Number': lead.transactionNumber || '—',

          // Status & Team Information
          'Status': lead.status || '',
          'HR Handler': lead.hrName || 'Unassigned',
          'Accounts Handler': lead.accountsHandlerName || 'N/A',
          'Manager': lead.managerName || 'N/A',

          // Dates
          'Created At': lead.createdAt || '',
          'Updated At': lead.updatedAt || ''
        };
      });

      if (format === 'xlsx') {
        // Excel export with summary and leads sheets
        const wb = xlsx.utils.book_new();

        // Create summary sheet with export metadata
        const summaryData = [
          { 'Export Information': 'Value' },
          { 'Export Generated': new Date(exportTimestamp).toLocaleString() },
          { 'Total Records': exportData.length },
          { 'Filtered by Status': status || 'All' },
          { 'Filtered by HR ID': hrId || 'All' },
          { 'Filtered by Accounts ID': accountsId || 'All' },
          { 'Date Range From': fromDate || 'All' },
          { 'Date Range To': toDate || 'All' },
          { 'Data Freshness': 'Real-time - Generated on demand' }
        ];

        const summarySeries = xlsx.utils.json_to_sheet(summaryData);
        xlsx.utils.book_append_sheet(wb, summarySeries, 'Summary');

        // Create leads sheet
        const ws = xlsx.utils.json_to_sheet(exportData);
        xlsx.utils.book_append_sheet(wb, ws, 'Leads');

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);
      } else {
        // CSV export
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=leads_export_${new Date().toISOString().split('T')[0]}.csv`);

        // Proper CSV generation with comprehensive escaping
        const escapeCSVValue = (value: any): string => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
          if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const headers = Object.keys(exportData[0] || {}).map(escapeCSVValue).join(',');
        const rows = exportData.map(row =>
          Object.values(row).map(escapeCSVValue).join(',')
        );
        const csv = [headers, ...rows].join('\n');

        res.send(csv);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Get date range for download
  app.get('/api/download-date-range', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Only allow accounts and admin roles to access date range
      if (!user || (user.role !== 'accounts' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Only accounts and admin users can download data" });
      }

      const ownedLeads = await storage.getLeadsByOwner(userId);
      const allLeadsResult = await storage.searchLeads({ ownerId: userId });
      const allLeads = allLeadsResult.leads;
      const userLeads = Array.from(new Map([...ownedLeads, ...allLeads].map(l => [l.id, l])).values());

      if (userLeads.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        return res.json({
          minDate: today,
          maxDate: today
        });
      }

      const dates = userLeads
        .map(l => l.createdAt ? new Date(l.createdAt).getTime() : 0)
        .filter(d => d > 0);

      const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
      const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];

      res.json({ minDate, maxDate });
    } catch (error) {
      console.error("Error fetching date range:", error);
      res.status(500).json({ message: "Failed to fetch date range" });
    }
  });

  // Notification routes
  // Download user data as Excel
  app.get('/api/download-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { fromDate, toDate } = req.query;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only allow accounts and admin roles to download
      if (user.role !== 'accounts' && user.role !== 'admin') {
        return res.status(403).json({ message: "Only accounts and admin users can download data" });
      }

      // Parse dates
      const startDate = fromDate ? new Date(fromDate) : null;
      const endDate = toDate ? new Date(toDate) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999);

      // Get all leads for this user (as owner or manager)
      const ownedLeads = await storage.getLeadsByOwner(userId);
      const allLeadsResult = await storage.searchLeads({ ownerId: userId });
      const allLeads = allLeadsResult.leads;
      let userLeads = Array.from(new Map([...ownedLeads, ...allLeads].map(l => [l.id, l])).values());

      // Filter by date range if provided
      if (startDate && endDate) {
        userLeads = userLeads.filter(lead => {
          if (!lead.createdAt) return false;
          const leadDate = new Date(lead.createdAt);
          return leadDate >= startDate && leadDate <= endDate;
        });
      }

      // Get notifications for this user
      let notifications = await storage.getUserNotifications(userId);

      // Filter notifications by date range if provided
      if (startDate && endDate) {
        notifications = notifications.filter(notif => {
          if (!notif.createdAt) return false;
          const notifDate = new Date(notif.createdAt);
          return notifDate >= startDate && notifDate <= endDate;
        });
      }

      // Create Excel workbook with multiple sheets
      const workbook = xlsx.utils.book_new();

      // Sheet 1: User Profile
      const userSheet = [
        {
          Field: 'Email',
          Value: user.email || '-'
        },
        {
          Field: 'Full Name',
          Value: user.fullName || user.firstName + ' ' + user.lastName || '-'
        },
        {
          Field: 'Role',
          Value: user.role || '-'
        },
        {
          Field: 'Status',
          Value: user.isActive ? 'Active' : 'Inactive'
        },
        {
          Field: 'Account Created',
          Value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'
        },
        {
          Field: 'Total Leads Owned',
          Value: userLeads.filter(l => l.currentOwnerId === userId).length
        },
        {
          Field: 'Total Leads Managed',
          Value: userLeads.filter(l => l.sourceManagerId === userId).length
        }
      ];
      const userWs = xlsx.utils.json_to_sheet(userSheet);
      userWs['!cols'] = [{ wch: 25 }, { wch: 40 }];
      xlsx.utils.book_append_sheet(workbook, userWs, 'Profile');

      // Sheet 2: Leads Overview - with HR name and payment details
      const leadsData = await Promise.all(userLeads.map(async (lead) => {
        const hrUser = lead.currentOwnerId ? await storage.getUser(lead.currentOwnerId) : null;
        return {
          'Lead ID': lead.id,
          'Name': lead.name || '-',
          'Email': lead.email || '-',
          'Phone': lead.phone || '-',
          'Location': lead.location || '-',
          'Domain': lead.domain || '-',
          'Degree': lead.degree || '-',
          'Status': lead.status || '-',
          'HR Name': hrUser ? (hrUser.fullName || hrUser.firstName + ' ' + hrUser.lastName || '-') : '-',
          'Walk-in Date': lead.walkinDate ? new Date(lead.walkinDate).toLocaleDateString() : '-',
          'Walk-in Time': lead.walkinTime || '-',
          'Registration Amount': lead.registrationAmount ? parseFloat(lead.registrationAmount.toString()) : 0,
          'Pending Amount': lead.pendingAmount ? parseFloat(lead.pendingAmount.toString()) : 0,
          'Concession': lead.concession ? parseFloat(lead.concession.toString()) : 0,
          'Session Days': lead.sessionDays || '-',
          'College Name': lead.collegeName || '-',
          'Year of Passing': lead.yearOfPassing || '-',
          'Created Date': lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'
        };
      }));

      const leadsWs = xlsx.utils.json_to_sheet(leadsData);
      leadsWs['!cols'] = [
        { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 15 }
      ];
      xlsx.utils.book_append_sheet(workbook, leadsWs, 'My Leads');

      // Sheet 3: Financial Summary (if user has leads with financial data)
      const financialData = userLeads
        .filter(l => l.registrationAmount || l.pendingAmount || l.partialAmount)
        .map(lead => ({
          'Lead ID': lead.id,
          'Lead Name': lead.name || '-',
          'Registration Amount': lead.registrationAmount ? parseFloat(lead.registrationAmount.toString()) : 0,
          'Pending Amount': lead.pendingAmount ? parseFloat(lead.pendingAmount.toString()) : 0,
          'Partial Amount': lead.partialAmount ? parseFloat(lead.partialAmount.toString()) : 0,
          'Transaction Number': lead.transactionNumber || '-',
          'Concession': lead.concession ? parseFloat(lead.concession.toString()) : 0,
          'Status': lead.status || '-'
        }));

      if (financialData.length > 0) {
        const financialWs = xlsx.utils.json_to_sheet(financialData);
        financialWs['!cols'] = [
          { wch: 10 }, { wch: 20 }, { wch: 18 },
          { wch: 15 }, { wch: 15 }, { wch: 20 },
          { wch: 12 }, { wch: 12 }
        ];
        xlsx.utils.book_append_sheet(workbook, financialWs, 'Financial');
      }

      // Sheet 4: Notifications
      const notificationsData = notifications.map(notif => ({
        'Date': notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : '-',
        'Title': notif.title || '-',
        'Message': notif.message || '-',
        'Type': notif.type || '-',
        'Status': notif.isRead ? 'Read' : 'Unread'
      }));

      if (notificationsData.length > 0) {
        const notifWs = xlsx.utils.json_to_sheet(notificationsData);
        notifWs['!cols'] = [
          { wch: 15 }, { wch: 20 }, { wch: 40 },
          { wch: 12 }, { wch: 12 }
        ];
        xlsx.utils.book_append_sheet(workbook, notifWs, 'Notifications');
      }

      // Send Excel file
      const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="MyData_${new Date().getTime()}.xlsx"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error downloading data:", error);
      res.status(500).json({ message: "Failed to generate data export" });
    }
  });

  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/send', isAuthenticated, imageUpload.single('image'), async (req: any, res) => {
    try {
      const { title, message, roles: rolesStr } = req.body;
      const roles = JSON.parse(rolesStr || '[]');

      if (!title || !message || !roles || roles.length === 0) {
        return res.status(400).json({ message: "Title, message, and roles are required" });
      }

      // Convert image to base64 if provided
      let imageUrl = null;
      if (req.file) {
        const base64 = req.file.buffer.toString('base64');
        imageUrl = `data:${req.file.mimetype};base64,${base64}`;
      }

      // Get all users in the specified roles
      const roleUsers: any[] = [];
      for (const role of roles) {
        const usersInRole = await storage.getUsersByRole(role);
        roleUsers.push(...usersInRole);
      }

      // Create notifications for each user
      const createdNotifications = [];
      for (const user of roleUsers) {
        // Delete old notifications for this user
        await storage.deleteUserNotifications(user.id);

        // Create new notification
        const notification = await storage.createNotification({
          userId: user.id,
          title,
          message,
          type: 'manager_notification',
          imageUrl,
          isRead: false,
        });
        createdNotifications.push(notification);
      }

      // Broadcast via WebSocket to all connected clients
      Array.from(wss.clients).forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'manager_notification',
            data: {
              title,
              message,
              imageUrl,
              sentTo: roles,
            }
          }));
        }
      });

      res.json({ success: true, notificationsCreated: createdNotifications.length });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationRead(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Chat transcript endpoints
  app.post('/api/chat/ask', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user;

      // Handle hardcoded manager ID
      if (userId === 'hardcoded-manager-id') {
        user = await storage.getUserByEmail(req.user.claims.email);
      } else {
        user = await storage.getUser(userId);
      }

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { question, category } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Question is required" });
      }

      // Use Gemini API to generate response
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        console.error("Gemini API key not found in environment variables");
        return res.status(500).json({ message: "Gemini API key not configured" });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const systemPrompt = `You are VHomofi HRM Assistant powered by VCodez. You help HR professionals with their daily tasks related to lead management, candidate tracking, and HR processes. Be helpful, professional, and concise.`;

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
          {
            role: "model",
            parts: [{ text: "I understand. I am VHomofi HRM Assistant, ready to help with HR and lead management tasks." }],
          },
        ],
      });

      const result = await chat.sendMessage(question);
      const answer = result.response.text();

      // Save transcript to database
      const transcript = await storage.createChatTranscript({
        hrUserId: user.id,
        question,
        answer,
        category: category || null,
      });

      res.json({
        success: true,
        answer,
        transcriptId: transcript.id
      });
    } catch (error: any) {
      console.error("Error in chat API:", error);
      res.status(500).json({ message: "Failed to process chat request", error: error.message });
    }
  });

  app.get('/api/chat/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user;

      // Handle hardcoded manager ID
      if (userId === 'hardcoded-manager-id') {
        user = await storage.getUserByEmail(req.user.claims.email);
      } else {
        user = await storage.getUser(userId);
      }

      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can view chat history" });
      }

      const transcripts = await storage.getAllChatTranscripts();
      res.json(transcripts);
    } catch (error: any) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.delete('/api/chat/history/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user;

      // Handle hardcoded manager ID
      if (userId === 'hardcoded-manager-id') {
        user = await storage.getUserByEmail(req.user.claims.email);
      } else {
        user = await storage.getUser(userId);
      }

      if (!user || user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can delete chat history" });
      }

      const { id } = req.params;
      await storage.deleteChatTranscript(parseInt(id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting chat transcript:", error);
      res.status(500).json({ message: "Failed to delete chat transcript" });
    }
  });

  // Productivity tracking endpoints
  app.post('/api/productivity/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(403).json({ message: "User not found" });
      }

      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ message: "Events array is required" });
      }

      // Process events: for tabSwitch events, fetch URL details from Gemini
      const processedEvents = await Promise.all(events.map(async (event: any) => {
        const eventData: any = {
          userId,
          eventType: event.eventType,
          metadata: event.metadata || null
        };

        // For tab switch events, fetch URL details using Gemini API
        if (event.eventType === 'tabSwitch' && event.metadata?.url) {
          try {
            const urlDetails = await fetchUrlDetailsFromGemini(event.metadata.url, event.metadata.duration);
            if (!eventData.metadata) eventData.metadata = {};
            eventData.metadata.urlDetails = urlDetails;
          } catch (error) {
            console.error("Error fetching URL details from Gemini:", error);
            // Continue without URL details if Gemini fails
          }
        }

        return eventData;
      }));

      const savedEvents = await storage.createProductivityEvents(processedEvents);
      res.json({ success: true, savedCount: savedEvents.length });
    } catch (error: any) {
      console.error("Error saving productivity events:", error);
      res.status(500).json({ message: "Failed to save productivity events" });
    }
  });

  // Helper function to fetch URL details from Gemini API
  async function fetchUrlDetailsFromGemini(url: string, duration?: number): Promise<string> {
    try {
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("Gemini API key not found");
        return "Tab switch detected";
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // If it's a generic "Switched to another tab/app" message, extract the duration info
      if (url.includes("Switched to another tab") || url.includes("Window lost focus")) {
        const prompt = `User switched to another application/tab and was away for ${duration || 0} seconds. Generate a brief label for what they switched to. Be specific - if it could be YouTube, say "Switched to video platform". If social media, say "Switched to social media". Keep it to 3-4 words max. Message: "${url}"`;
        const result = await model.generateContent(prompt);
        return result.response.text() || "Tab switch detected";
      }

      const prompt = `Briefly describe what this URL is about in 1-2 sentences. Focus on the website name if possible. URL: ${url}`;
      const result = await model.generateContent(prompt);

      return result.response.text() || "External website accessed";
    } catch (error) {
      console.error("Error with Gemini API:", error);
      return "Tab switch detected";
    }
  }

  app.get('/api/productivity/idle-warnings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Handle hardcoded manager
      let isManager = false;
      if (userId === 'hardcoded-manager-id') {
        isManager = true;
      } else {
        const user = await storage.getUser(userId);
        isManager = user?.role === 'manager';
      }

      if (!isManager) {
        return res.status(403).json({ message: "Only managers can view idle warnings" });
      }

      // Get all HR users
      const hrUsers = await storage.getUsersByRole('hr');

      // Get all idle warnings for all HR users (including tab switches)
      const allWarnings: any[] = [];
      for (const hrUser of hrUsers) {
        const events = await storage.getProductivityEvents({ userId: hrUser.id });

        // Filter idle warnings AND tab switch events
        const relevantEvents = events.filter((e: any) =>
          ['mouseIdleWarning', 'keyboardIdleWarning', 'longKeyPressWarning', 'tabSwitch'].includes(e.eventType)
        );

        for (const warning of relevantEvents) {
          allWarnings.push({
            id: warning.id,
            userId: hrUser.id,
            userName: hrUser.fullName || hrUser.email,
            userEmail: hrUser.email,
            warningType: warning.eventType,
            warningLabel: warning.eventType === 'mouseIdleWarning' ? 'Mouse Idle' :
              warning.eventType === 'keyboardIdleWarning' ? 'Keyboard Idle' :
                warning.eventType === 'longKeyPressWarning' ? 'Long Key Press' :
                  'Tab Switch',
            createdAt: warning.createdAt,
            metadata: warning.metadata,
            urlDetails: (warning.metadata as any)?.urlDetails || null
          });
        }
      }

      // Sort by most recent first
      allWarnings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(allWarnings);
    } catch (error: any) {
      console.error("Error fetching idle warnings:", error);
      res.status(500).json({ message: "Failed to fetch idle warnings" });
    }
  });

  app.get('/api/productivity/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Handle hardcoded manager
      let isManager = false;
      if (userId === 'hardcoded-manager-id') {
        isManager = true;
      } else {
        const user = await storage.getUser(userId);
        isManager = user?.role === 'manager';
      }

      if (!isManager) {
        return res.status(403).json({ message: "Only managers can view productivity summary" });
      }

      const summary = await storage.getHRProductivitySummary();
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching productivity summary:", error);
      res.status(500).json({ message: "Failed to fetch productivity summary" });
    }
  });

  app.get('/api/teams-productivity', isAuthenticated, async (req: any, res) => {
    try {
      const requesterId = req.user.claims.sub;

      // Handle hardcoded manager
      let isManager = false;
      if (requesterId === 'hardcoded-manager-id') {
        isManager = true;
      } else {
        const requester = await storage.getUser(requesterId);
        isManager = requester?.role === 'manager';
      }

      if (!isManager) {
        return res.status(403).json({ message: "Only managers can view team productivity" });
      }

      // Get all team leads
      const teamLeads = await storage.getUsersByRole('team_lead');

      const teamsData = await Promise.all(teamLeads.map(async (teamLead: any) => {
        // Get all HR users in this team
        const allHrUsers = await storage.getUsersByRole('hr');
        const teamMembers = allHrUsers.filter((hr: any) => hr.teamLeadId === teamLead.id);

        // Get team metrics
        const allTeamLeads = await Promise.all(teamMembers.map(async (member: any) => {
          const memberLeads = await storage.searchLeads({ ownerId: member.id, limit: 1000 });
          const completedLeads = await storage.searchLeads({
            previousOwnerId: member.id,
            status: 'completed',
            limit: 1000
          });

          // Get schedules grouped by walk-in date
          const scheduledLeads = await storage.searchLeads({
            ownerId: member.id,
            limit: 1000
          });

          const schedulesByDate: { [date: string]: number } = {};
          scheduledLeads.leads.forEach((lead: any) => {
            if (lead.walkinDate) {
              schedulesByDate[lead.walkinDate] = (schedulesByDate[lead.walkinDate] || 0) + 1;
            }
          });

          // Calculate total schedules for this member
          const totalSchedules = Object.values(schedulesByDate).reduce((sum, count) => sum + count, 0);

          return {
            id: member.id,
            name: member.fullName,
            email: member.email,
            totalLeads: memberLeads.total,
            completedLeads: completedLeads.total,
            totalSchedules,
            schedulesByDate
          };
        }));

        const totalMetrics = {
          totalLeads: allTeamLeads.reduce((sum, m) => sum + m.totalLeads, 0),
          totalCompleted: allTeamLeads.reduce((sum, m) => sum + m.completedLeads, 0),
          totalSchedules: allTeamLeads.reduce((sum, m) => sum + m.totalSchedules, 0)
        };

        return {
          id: teamLead.id,
          teamName: teamLead.teamName,
          teamLeadName: teamLead.fullName,
          memberCount: teamMembers.length,
          totalLeads: totalMetrics.totalLeads,
          completedLeads: totalMetrics.totalCompleted,
          completionRate: totalMetrics.totalLeads > 0 ? Math.round((totalMetrics.totalCompleted / totalMetrics.totalLeads) * 100) : 0,
          scheduleCount: totalMetrics.totalSchedules,
          members: allTeamLeads
        };
      }));

      res.json(teamsData);
    } catch (error: any) {
      console.error("Error fetching teams productivity:", error);
      res.status(500).json({ message: "Failed to fetch teams productivity" });
    }
  });

  app.get('/api/productivity/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const requesterId = req.user.claims.sub;

      // Handle hardcoded manager
      let isManager = false;
      if (requesterId === 'hardcoded-manager-id') {
        isManager = true;
      } else {
        const requester = await storage.getUser(requesterId);
        isManager = requester?.role === 'manager';
      }

      if (!isManager) {
        return res.status(403).json({ message: "Only managers can view user productivity" });
      }

      const { userId } = req.params;
      const stats = await storage.getProductivityStats(userId);
      const events = await storage.getProductivityEvents({ userId });

      const targetUser = await storage.getUser(userId);

      res.json({
        userId,
        userName: targetUser?.fullName || targetUser?.username || targetUser?.email || 'Unknown',
        stats,
        events
      });
    } catch (error: any) {
      console.error("Error fetching user productivity:", error);
      res.status(500).json({ message: "Failed to fetch user productivity" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    verifyClient: (info: any) => {
      // Basic verification - could be enhanced with session validation
      const origin = info.origin;
      return origin && (origin.includes('replit.dev') || origin.includes('localhost'));
    }
  });

  // Store authenticated connections with user info
  const authenticatedClients = new Map<WebSocket, any>();

  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    let userId = null;
    let userRole = null;
    let userInfo = null;

    try {
      // Note: With PGlite/MemoryStore, we can't lookup sessions directly from WebSocket
      // WebSocket connections are allowed but without user identification
      // The main HTTP requests use proper session authentication
      console.log('WebSocket client connected');

      // Allow connection without session validation for now
      // Real-time features will work but without user-specific context
      userId = 'websocket-client';
      userRole = 'anonymous';

      if (!userId) {
        console.log('WebSocket client connected without valid session, closing...');
        ws.close(4001, 'Unauthorized');
        return;
      }

    } catch (error) {
      console.error('WebSocket session validation error:', error);
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Store authenticated connection
    authenticatedClients.set(ws, {
      userId,
      userRole,
      userEmail: null,
      connected: Date.now()
    });

    ws.on('message', (message: Buffer) => {
      console.log(`Received from user ${userId}:`, message.toString());
    });

    ws.on('close', () => {
      authenticatedClients.delete(ws);
      console.log(`WebSocket client disconnected: ${userId}`);
    });
  });

  // Broadcast function for real-time updates with role-based filtering
  (global as any).broadcastUpdate = (type: string, data: any, options: {
    userIds?: string[],
    roles?: string[],
    excludeRoles?: string[]
  } = {}) => {
    authenticatedClients.forEach((clientInfo, client) => {
      if (client.readyState !== WebSocket.OPEN) return;

      // Skip unauthenticated clients
      if (!clientInfo.userId && !clientInfo.userRole) {
        console.log('Skipping broadcast to unauthenticated client');
        return;
      }

      // Role-based filtering
      if (options.roles && options.roles.length > 0) {
        if (!options.roles.includes(clientInfo.userRole)) return;
      }

      if (options.excludeRoles && options.excludeRoles.length > 0) {
        if (options.excludeRoles.includes(clientInfo.userRole)) return;
      }

      // User-specific filtering
      if (options.userIds && options.userIds.length > 0) {
        if (!options.userIds.includes(clientInfo.userId)) return;
      }

      try {
        client.send(JSON.stringify({ type, data }));
        console.log(`Broadcast sent to user ${clientInfo.userId} (${clientInfo.userRole}): ${type}`);
      } catch (error) {
        console.error('Error sending broadcast:', error);
      }
    });
  };

  // Gemini API endpoint to detect page name from tab information
  app.post('/api/gemini/detect-page', isAuthenticated, async (req: any, res) => {
    try {
      const { tabName, pageTitle } = req.body;
      const pageName = tabName === 'warnings' ? 'Idle Warnings' :
        tabName === 'teams' ? 'Team Analytics' :
          'Productivity Dashboard';
      res.json({ pageName });
    } catch (error) {
      console.error("Error detecting page name:", error);
      res.status(500).json({ message: "Failed to detect page name", pageName: 'Productivity' });
    }
  });

  // ===== KATHAIPOM (SOCIAL FEED) ROUTES =====

  // Create a post (Manager only)
  app.post('/api/kathaipom/posts', isAuthenticated, imageUpload.single('image'), async (req: any, res) => {
    try {
      console.log('[Kathaipom POST] Request received');
      const userId = req.user.claims.sub;
      console.log('[Kathaipom POST] User ID:', userId);

      // Fetch user from database to get correct role and real ID
      let user = await storage.getUser(userId);

      // If hardcoded manager, try to find real user by email to get valid UUID
      if (userId === 'hardcoded-manager-id' || !user) {
        const dbUser = await storage.getUserByEmail(req.user.claims.email);
        if (dbUser) {
          user = dbUser;
          console.log('[Kathaipom POST] Found real DB user for hardcoded session:', user.id);
        } else if (userId === 'hardcoded-manager-id') {
          // Fallback if DB user doesn't exist yet but it's the hardcoded manager
          user = { id: userId, role: 'manager', email: req.user.claims.email } as any;
        }
      }

      console.log('[Kathaipom POST] Final User:', user?.email, 'Role:', user?.role, 'ID:', user?.id);

      if (!user || user.role !== 'manager') {
        console.log('[Kathaipom POST] Access denied - not a manager');
        return res.status(403).json({ message: 'Only managers can create posts' });
      }

      const postUserId = user.id; // Use real ID if found, otherwise will still fail FK if hardcoded-manager-id 
      // but vcodezmanager@gmail.com should exist in DB.

      const { content } = req.body;
      console.log('[Kathaipom POST] Content:', content?.substring(0, 50));

      if (!content) {
        console.log('[Kathaipom POST] No content provided');
        return res.status(400).json({ message: 'Content is required' });
      }

      // Handle image upload if present
      let imageUrl: string | undefined;
      if (req.file) {
        console.log('[Kathaipom POST] Image file present, size:', req.file.size);
        // Convert image to base64 data URL for storage
        const base64Image = req.file.buffer.toString('base64');
        imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;
      }

      console.log('[Kathaipom POST] Creating post in database...');
      const post = await storage.createPost(postUserId, content, imageUrl);
      console.log('[Kathaipom POST] Post created successfully:', post?.id);
      res.json(post);
    } catch (error: any) {
      console.error('[Kathaipom POST] Error creating post:', error);
      res.status(500).json({
        message: 'Failed to create post',
        error: error.message || 'Internal server error'
      });
    }
  });

  // Get all posts
  app.get('/api/kathaipom/posts', isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      let userId = req.user.claims.sub;
      const email = req.user.claims.email;

      // Resolve real user for consistency
      const dbUser = await storage.getUserByEmail(email);
      if (dbUser) {
        userId = dbUser.id;
      }

      const logPath = path.join(process.cwd(), 'kathaipom_debug.log');
      const logMsg = `${new Date().toISOString()} [ROUTE] GET POSTS - Email: ${email}, Resolved ID: ${userId}\n`;
      fs.appendFileSync(logPath, logMsg);

      const fetchedPosts = await storage.getPosts(limit, offset, userId);
      res.json(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  // Delete a post (Manager only)
  app.delete('/api/kathaipom/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Handle hardcoded manager
      if (userId !== 'hardcoded-manager-id') {
        const user = await storage.getUser(userId);
        if (!user || user.role !== 'manager') {
          return res.status(403).json({ message: 'Only managers can delete posts' });
        }
      }

      const postId = parseInt(req.params.id);
      await storage.deletePost(postId);
      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ message: 'Failed to delete post' });
    }
  });

  // Toggle like on a post
  app.post('/api/kathaipom/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const email = req.user.claims.email;
      let userId = req.user.claims.sub;
      const postId = parseInt(req.params.id);

      const dbUser = await storage.getUserByEmail(email);
      if (dbUser) userId = dbUser.id;

      const result = await storage.likePost(postId, userId);
      res.json(result);
    } catch (error: any) {
      console.error('Like error:', error);
      res.status(500).json({ message: 'Failed to like post' });
    }
  });

  // Toggle dislike on a post
  app.post('/api/kathaipom/posts/:id/dislike', isAuthenticated, async (req: any, res) => {
    try {
      const email = req.user.claims.email;
      let userId = req.user.claims.sub;
      const postId = parseInt(req.params.id);

      const dbUser = await storage.getUserByEmail(email);
      if (dbUser) userId = dbUser.id;

      const result = await storage.dislikePost(postId, userId);
      res.json(result);
    } catch (error: any) {
      console.error('Dislike error:', error);
      res.status(500).json({ message: 'Failed to dislike post' });
    }
  });

  // Get post comments
  app.get('/api/kathaipom/posts/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });

  // Add a comment to a post
  app.post('/api/kathaipom/posts/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      let userId = req.user.claims.sub;
      let user = await storage.getUser(userId);

      // Resolve real user for hardcoded manager
      if (!user || userId === 'hardcoded-manager-id') {
        const dbUser = await storage.getUserByEmail(req.user.claims.email);
        if (dbUser) {
          user = dbUser;
          userId = dbUser.id;
        } else if (userId === 'hardcoded-manager-id') {
          user = { id: userId, fullName: 'Manager', firstName: 'Manager', email: req.user.claims.email } as any;
        }
      }

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const postId = parseInt(req.params.id);
      const { comment_text } = req.body;

      if (!comment_text) {
        return res.status(400).json({ message: 'Comment text is required' });
      }

      const comment = await storage.addComment(
        postId,
        userId,
        user.fullName || user.firstName || 'Unknown User',
        user.email || '',
        comment_text
      );

      res.json(comment);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Failed to add comment' });
    }
  });

  // Delete a comment (Manager only)
  app.delete('/api/kathaipom/comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Handle hardcoded manager
      if (userId !== 'hardcoded-manager-id') {
        const user = await storage.getUser(userId);
        if (!user || user.role !== 'manager') {
          return res.status(403).json({ message: 'Only managers can delete comments' });
        }
      }

      const commentId = parseInt(req.params.id);
      await storage.deleteComment(commentId);
      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });


  // ==================== CLASS MANAGEMENT API ENDPOINTS ====================

  // Create a new class
  app.post('/api/classes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('[POST /api/classes] User ID from token:', userId);
      console.log('[POST /api/classes] User claims:', JSON.stringify(req.user.claims));

      const user = await storage.getUser(userId);
      console.log('[POST /api/classes] User from DB:', user ? `ID: ${user.id}, Role: ${user.role}, Email: ${user.email}` : 'NOT FOUND');

      // Allow admins and session organizers to create classes
      if (!user || (user.role !== 'admin' && user.role !== 'session-coordinator' && user.role !== 'manager')) {
        console.log('[POST /api/classes] Access denied - User role:', user?.role);
        return res.status(403).json({ message: 'Only admins and session organizers can create classes' });
      }

      // Validate request body
      const classData = insertClassSchema.parse({
        ...req.body,
        instructorId: userId, // Set instructor to current user
      });

      console.log('[POST /api/classes] Creating class with data:', JSON.stringify(classData));

      const newClass = await storage.createClass(classData);
      console.log('[POST /api/classes] Class created successfully:', JSON.stringify(newClass));

      res.json(newClass);
    } catch (error: any) {
      console.error('[POST /api/classes] Error:', error.message);
      console.error('[POST /api/classes] Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to create class', error: error.message });
    }
  });

  // Get all classes with student counts
  app.get('/api/classes/with-counts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Get instructorId from query params or default to current user
      const instructorId = (req.query.instructorId as string) || userId;

      console.log('[GET /api/classes/with-counts] Fetching classes for instructor:', instructorId);

      const classesWithCounts = await storage.getClassesWithStudentCount(instructorId);

      res.json(classesWithCounts);
    } catch (error: any) {
      console.error('[GET /api/classes/with-counts] Error:', error);
      res.status(500).json({ message: 'Failed to fetch classes', error: error.message });
    }
  });

  // Delete a class
  app.delete('/api/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const classId = parseInt(req.params.id);

      if (isNaN(classId)) {
        return res.status(400).json({ message: 'Invalid class ID' });
      }

      // Get the class to verify ownership
      const classToDelete = await storage.getClass(classId);

      if (!classToDelete) {
        return res.status(404).json({ message: 'Class not found' });
      }

      // Only allow instructor or admin/manager to delete
      if (classToDelete.instructorId !== userId && user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: 'You can only delete your own classes' });
      }

      console.log('[DELETE /api/classes/:id] Deleting class:', classId);

      await storage.deleteClass(classId);

      res.json({ message: 'Class deleted successfully' });
    } catch (error: any) {
      console.error('[DELETE /api/classes/:id] Error:', error);
      res.status(500).json({ message: 'Failed to delete class', error: error.message });
    }
  });

  // Get all students for a class with their mapping data (Student ID, joinedAt)
  app.get('/api/classes/:id/student-mappings', isAuthenticated, async (req: any, res) => {
    try {
      console.log('[student-mappings] Starting request for class:', req.params.id);
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) return res.status(400).json({ message: 'Invalid class ID' });

      console.log('[student-mappings] Step 1: Getting user...');
      const userId = req.user?.claims?.sub;
      if (!userId) {
        console.error('[student-mappings] No user ID found in request');
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const user = await storage.getUser(userId);
      console.log('[student-mappings] Step 2: User fetched:', user?.email);

      console.log('[student-mappings] Step 3: Getting class...');
      const cls = await storage.getClass(classId);
      console.log('[student-mappings] Step 4: Class fetched:', cls?.name);

      if (!cls) {
        return res.status(404).json({ message: 'Class not found' });
      }

      // Fetch existing mappings
      console.log('[student-mappings] Step 5: Getting mappings...');
      let mappings = await storage.getClassStudentMappings(classId);
      console.log('[student-mappings] Step 6: Mappings fetched, count:', mappings.length);

      // STEP 1: Auto-enrollment (Tech Support only)
      // If no students enrolled yet, and it's a tech-support mentor,
      // try to auto-enroll leads assigned to them that are not in any class
      if (mappings.length === 0 && user?.role === 'tech-support') {
        if (cls.mentorEmail?.toLowerCase() === user.email?.toLowerCase()) {
          const mentorLeads = await storage.getLeadsByOwner(user.id);
          const enrollableLeads = mentorLeads.filter(l =>
            (l.status === 'ready_for_class' || l.status === 'register') &&
            l.isActive
          );

          if (enrollableLeads.length > 0) {
            console.log(`[student-mappings] Auto-enrolling ${enrollableLeads.length} leads for mentor ${user.email}`);
            for (const lead of enrollableLeads) {
              // Only enroll if not already in another class
              const inClass = await storage.isStudentInAnyClass(lead.id);
              if (!inClass) {
                await storage.addStudentToClass(classId, lead.id);
              }
            }
            // Re-fetch mappings after auto-enrollment
            mappings = await storage.getClassStudentMappings(classId);
          }
        }
      }

      // STEP 2: Auto-generate IDs (All roles)
      // Check if any students are missing IDs and generate them
      if (mappings.length > 0) {
        const studentsWithoutIds = mappings.filter(m => !m.studentId);

        if (studentsWithoutIds.length > 0) {
          console.log(`[student-mappings] Auto-generating IDs for ${studentsWithoutIds.length} students`);
          const subject = cls.subject || cls.name || 'Student';

          // Sort ALL mappings by joinedAt to maintain sequential order
          // Handle null/undefined joinedAt by using current time as fallback
          const sortedMappings = mappings.sort((a, b) => {
            const timeA = a.joinedAt ? new Date(a.joinedAt).getTime() : Date.now();
            const timeB = b.joinedAt ? new Date(b.joinedAt).getTime() : Date.now();
            return timeA - timeB;
          });

          // Generate IDs for all students to ensure proper sequence
          for (let i = 0; i < sortedMappings.length; i++) {
            try {
              const studentId = `${subject}-${(i + 1).toString().padStart(2, '0')}`;
              // Only update if the ID is different or missing
              if (sortedMappings[i].studentId !== studentId) {
                await storage.updateStudentId(classId, sortedMappings[i].leadId, studentId);
                console.log(`[student-mappings] Generated ID ${studentId} for lead ${sortedMappings[i].leadId}`);
              }
            } catch (err) {
              console.error(`[student-mappings] Failed to generate ID for lead ${sortedMappings[i].leadId}:`, err);
              // Continue with other students even if one fails
            }
          }

          // Re-fetch mappings after ID generation
          mappings = await storage.getClassStudentMappings(classId);
          console.log(`[student-mappings] Successfully generated IDs for students in class ${classId}`);
        }
      }

      const leads = await storage.getClassStudents(classId);

      // Combine leads with their specific mapping data
      const students = leads.map(lead => {
        const mapping = mappings.find(m => m.leadId === lead.id);
        return {
          ...lead,
          studentId: mapping?.studentId,
          joinedAt: mapping?.joinedAt,
          mappingId: mapping?.id
        };
      });

      res.json(students);
    } catch (error: any) {
      console.error('[student-mappings] Error:', error);
      res.status(500).json({ message: 'Failed to fetch student mappings', error: error.message });
    }
  });

  // Marks endpoints
  app.get('/api/classes/:id/marks', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) return res.status(400).json({ message: 'Invalid class ID' });

      console.log(`[GET marks] Fetching marks for class ${classId}`);
      const marks = await storage.getMarks(classId);
      console.log(`[GET marks] Found ${marks.length} marks`);
      res.json(marks);
    } catch (error: any) {
      console.error('[GET marks] Error:', error);
      res.status(500).json({ message: 'Failed to fetch marks', error: error.message });
    }
  });

  app.post('/api/classes/:id/marks', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) return res.status(400).json({ message: 'Invalid class ID' });

      console.log(`[POST mark] Saving mark for lead ${req.body.leadId} in class ${classId}`);
      const markData = {
        ...req.body,
        classId,
        leadId: req.body.leadId,
      };

      const mk = await storage.addMark(markData);
      res.json(mk);
    } catch (error: any) {
      console.error('[POST mark] Error:', error);
      res.status(500).json({ message: 'Failed to save mark', error: error.message });
    }
  });

  app.post('/api/classes/:id/marks/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) return res.status(400).json({ message: 'Invalid class ID' });

      console.log(`[POST marks bulk] Saving bulk marks for class ${classId}`);
      console.log(`[POST marks bulk] Request body:`, JSON.stringify(req.body, null, 2));

      const { marks: marksList } = req.body;
      if (!Array.isArray(marksList)) {
        console.log(`[POST marks bulk] Error: marks is not an array`);
        return res.status(400).json({ message: 'Invalid marks data' });
      }

      console.log(`[POST marks bulk] Received ${marksList.length} marks to save`);

      const results = [];
      for (const mark of marksList) {
        // Explicitly extract only the fields we need to avoid schema mismatches
        const markData = {
          classId,
          leadId: mark.leadId,
          assessment1: mark.assessment1 ?? 0,
          assessment2: mark.assessment2 ?? 0,
          task: mark.task ?? 0,
          project: mark.project ?? 0,
          finalValidation: mark.finalValidation ?? 0,
        };

        console.log(`[POST marks bulk] Saving mark for lead ${mark.leadId}:`, markData);
        const mk = await storage.addMark(markData);
        console.log(`[POST marks bulk] Saved mark ID ${mk.id} successfully`);
        results.push(mk);
      }
      console.log(`[POST marks bulk] Saved ${results.length} marks successfully`);

      res.json(results);
    } catch (error: any) {
      console.error('[POST marks bulk] Error:', error);
      console.error('[POST marks bulk] Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to save marks', error: error.message });
    }
  });


  // Bulk generate Student IDs for a class
  app.post('/api/classes/:id/generate-student-ids', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) return res.status(400).json({ message: 'Invalid class ID' });

      const cls = await storage.getClass(classId);
      if (!cls) return res.status(404).json({ message: 'Class not found' });

      const subject = cls.subject || cls.name || 'Student';
      const mappings = await storage.getClassStudentMappings(classId);

      // Sort mappings by joinedAt to provide sequential IDs
      const sortedMappings = mappings.sort((a, b) => new Date(a.joinedAt!).getTime() - new Date(b.joinedAt!).getTime());

      for (let i = 0; i < sortedMappings.length; i++) {
        const studentId = `${subject}-${(i + 1).toString().padStart(2, '0')}`;
        await storage.updateStudentId(classId, sortedMappings[i].leadId, studentId);
      }

      res.json({ message: 'Student IDs generated successfully' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to generate student IDs', error: error.message });
    }
  });

  // Get attendance for a class
  app.get('/api/classes/:id/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { date } = req.query;
      const attendanceData = await storage.getAttendance(classId, date as string);
      res.json(attendanceData);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
    }
  });

  // Mark attendance
  app.post('/api/classes/:id/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const attendanceData = insertAttendanceSchema.parse({
        ...req.body,
        classId
      });
      const result = await storage.markAttendance(attendanceData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: 'Invalid attendance data', error: error.message });
    }
  });

  // Bulk mark attendance
  app.post('/api/classes/:id/attendance/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { attendance: attendanceList } = req.body;

      if (!Array.isArray(attendanceList)) {
        return res.status(400).json({ message: 'Invalid attendance data format' });
      }

      // Fetch class, teacher, and email config once for optimization
      const classObj = await storage.getClass(classId);
      // Fetch the class instructor as a fallback
      const instructor = classObj ? await storage.getUser(classObj.instructorId) : null;
      // Fetch the CURRENT logged-in user from database to get their full details
      const userId = req.user?.claims?.sub || req.user?.id;
      const currentUser = await storage.getUser(userId);
      const teacherName = currentUser?.fullName || currentUser?.firstName || instructor?.fullName || instructor?.firstName || 'Team Lead';
      const teacherEmail = currentUser?.email || instructor?.email || '';

      // Try to get email config - wrapped in try-catch to handle missing userId column
      let emailConfig: any = null;
      try {
        emailConfig = await storage.getEmailConfig(userId);
      } catch (emailConfigErr) {
        console.log(`[POST attendance bulk] Email config fetch failed (likely missing userId column):`, emailConfigErr);
      }
      const resendKey = process.env.RESEND_API_KEY;

      // Fallback to environment variables if no email config
      if (!emailConfig && !resendKey) {
        const envEmail = process.env.SMTP_EMAIL;
        const envPassword = process.env.SMTP_PASSWORD;
        if (envEmail && envPassword) {
          emailConfig = {
            smtpEmail: envEmail,
            appPassword: envPassword,
            smtpServer: process.env.SMTP_SERVER || 'smtp.gmail.com',
            smtpPort: parseInt(process.env.SMTP_PORT || '587'),
            isEnabled: true
          };
          console.log(`[POST attendance bulk] Using fallback SMTP from environment variables`);
        }
      }

      console.log(`[POST attendance bulk] ═══════════════════════════════════`);
      console.log(`[POST attendance bulk] Current User (req.user):`, {
        id: req.user?.id,
        email: req.user?.email,
        fullName: req.user?.fullName,
        firstName: req.user?.firstName,
        role: req.user?.role
      });
      console.log(`[POST attendance bulk] Email Identity: ${teacherName} <${teacherEmail}>`);
      console.log(`[POST attendance bulk] Email Config: Resend=${!!resendKey}, SMTP=${!!emailConfig}`);
      if (emailConfig) {
        console.log(`[POST attendance bulk] SMTP Config: ${emailConfig.smtpEmail?.substring(0, 8)}..., Server=${emailConfig.smtpServer}, Port=${emailConfig.smtpPort}`);
      }
      console.log(`[POST attendance bulk] ═══════════════════════════════════`);

      const results = [];
      for (const record of attendanceList) {
        const attendanceData = insertAttendanceSchema.parse({
          ...record,
          classId
        });
        const result = await storage.markAttendance(attendanceData);
        results.push(result);

        // Send email if student is absent
        console.log(`[POST attendance bulk] Record: leadId=${record.leadId}, status="${record.status}", isAbsent=${record.status === 'Absent'}`);
        if (record.status === 'Absent') {
          console.log(`[POST attendance bulk] Student ${record.leadId} marked Absent. Checking email trigger...`);
          try {
            const student = await storage.getLead(record.leadId);
            if (student && student.email && (resendKey || emailConfig)) {
              console.log(`[POST attendance bulk] Sending email to student: ${student.email}`);
              const formattedDate = format(new Date(record.date), 'EEEE, MMMM dd, yyyy');

              const emailText = `Dear ${student.name},

This is an automated notification to inform you that you were marked absent in the following class:

📚 Intership Details:
   • Session: ${classObj?.name || 'Class'}
   • Domain: ${classObj?.subject || 'N/A'}
   • Date: ${formattedDate}
   • Team Lead: ${teacherName}

📝 Action Required:
Please provide a reason for your absence by replying to this email.

⚠️ Important Note:
If you have already informed your team lead about this absence, please ignore this email.

If you believe this absence notification is incorrect, please contact your Team Lead immediately to resolve the issue.

Best regards,
${teacherName}
📧 ${teacherEmail}

---
This is an automated message from the Attendance Management System.
Please do not reply to this email unless providing absence justification.`;

              const emailHtml = `<p>Dear <b>${student.name}</b>,</p>
<p>This is an automated notification to inform you that you were marked absent in the following class:</p>
<div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0;">
  <p style="margin: 0; font-size: 16px;"><b>📚 Internship Details:</b></p>
  <ul style="list-style-type: none; padding-left: 0; margin-top: 10px;">
    <li>• <b>Session:</b> ${classObj?.name || 'Class'}</li>
    <li>• <b>Domain:</b> ${classObj?.subject || 'N/A'}</li>
    <li>• <b>Date:</b> ${formattedDate}</li>
    <li>• <b>Team Lead:</b> ${teacherName}</li>
  </ul>
</div>
<p><b>📝 Action Required:</b><br>Please provide a reason for your absence by replying to this email.</p>
<p style="color: #64748b; font-size: 14px;"><b>⚠️ Important Note:</b><br>If you have already informed your team lead about this absence, please ignore this email.</p>
<p style="color: #64748b; font-size: 14px;">If you believe this absence notification is incorrect, please contact your Team Lead immediately to resolve the issue.</p>
<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
<p style="margin: 0;">Best regards,</p>
<p style="margin: 0;"><b>${teacherName}</b></p>
<p style="margin: 0;">📧 ${teacherEmail}</p>
<br>
<p style="color: #94a3b8; font-size: 12px; font-style: italic;">This is an automated message from the Attendance Management System.<br>Please do not reply to this email unless providing absence justification.</p>`;

              await sendEmail({
                to: student.email,
                from: teacherEmail ? `"${teacherName}" <${teacherEmail}>` : undefined,
                subject: `Absence Notification - ${classObj?.name || 'Class'}`,
                text: emailText,
                html: emailHtml
              }, emailConfig ? {
                smtpServer: emailConfig.smtpServer,
                smtpPort: emailConfig.smtpPort,
                smtpEmail: emailConfig.smtpEmail,
                appPassword: emailConfig.appPassword
              } : undefined);

              console.log(`[POST attendance bulk] Absence email sent to ${student.email}`);
            } else {
              console.log(`[POST attendance bulk] Email skipped for lead ${record.leadId}. Reason: student=${!!student}, email=${student?.email}, config=${!!(resendKey || emailConfig)}`);
            }
          } catch (emailErr) {
            console.error(`[POST attendance bulk] Failed to send absence email to lead ${record.leadId}:`, emailErr);
          }
        }
      }

      res.json({ message: 'Attendance saved successfully', count: results.length, data: results });
    } catch (error: any) {
      console.error('[POST attendance bulk] Error:', error);
      res.status(400).json({ message: 'Failed to save attendance', error: error.message });
    }
  });

  // NOTE: Marks routes are defined earlier in the file (around line 4357-4420)
  // Do not add duplicate routes here

  // Update specific student ID
  app.patch('/api/classes/:id/students/:leadId/student-id', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const leadId = parseInt(req.params.leadId);
      const { studentId } = req.body;

      if (!studentId) return res.status(400).json({ message: 'Student ID is required' });

      await storage.updateStudentId(classId, leadId, studentId);
      res.json({ message: 'Student ID updated successfully' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to update student ID', error: error.message });
    }
  });

  // Remove student from class
  app.delete('/api/classes/:id/students/:leadId', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const leadId = parseInt(req.params.leadId);

      if (isNaN(classId) || isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid IDs' });
      }

      await storage.removeStudentFromClass(classId, leadId);
      res.json({ message: 'Student removed from class successfully' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to remove student from class', error: error.message });
    }
  });

  // Enroll students in a class
  app.post('/api/classes/:id/students', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { leadIds } = req.body;

      console.log(`[enroll-students] Enrolling ${leadIds?.length || 0} students in class ${classId}`);

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ message: 'Lead IDs are required' });
      }

      const enrolledIds = [];
      const skippedIds = [];

      for (const leadId of leadIds) {
        try {
          // Check if already enrolled
          const isEnrolled = await storage.isStudentInAnyClass(leadId);
          if (isEnrolled) {
            console.log(`[enroll-students] Lead ${leadId} already enrolled in a class, skipping`);
            skippedIds.push(leadId);
            continue;
          }
          await storage.addStudentToClass(classId, leadId);
          enrolledIds.push(leadId);
          console.log(`[enroll-students] Successfully enrolled lead ${leadId}`);
        } catch (err: any) {
          console.error(`[enroll-students] Failed to enroll lead ${leadId}:`, err.message);
          skippedIds.push(leadId);
        }
      }

      res.json({
        message: 'Students enrolled successfully',
        enrolledCount: enrolledIds.length,
        skippedCount: skippedIds.length
      });
    } catch (error: any) {
      console.error('[enroll-students] Error:', error);
      res.status(500).json({ message: 'Failed to enroll students', error: error.message });
    }
  });

  // Get leads ready for class
  app.get('/api/leads/ready-for-class', isAuthenticated, async (req: any, res) => {
    try {
      const leadsResult = await storage.searchLeads({ status: 'ready_for_class', limit: 1000 });
      res.json(leadsResult);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch ready for class leads', error: error.message });
    }
  });



  // Update student mapping (ID, joinedAt)
  app.patch('/api/classes/:classId/students/:leadId/mapping', isAuthenticated, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const leadId = parseInt(req.params.leadId);
      const { studentId, joinedAt } = req.body;

      await storage.updateStudentMapping(classId, leadId, { studentId, joinedAt });
      res.json({ message: 'Student mapping updated successfully' });
    } catch (error: any) {
      console.error('[PATCH /api/classes/:classId/students/:leadId/mapping] Error:', error);
      res.status(500).json({ message: 'Failed to update student mapping', error: error.message });
    }
  });

  // Get all allocated students
  app.get('/api/students/allocated', isAuthenticated, async (req: any, res) => {
    try {
      const students = await storage.getAllAllocatedStudents();
      res.json(students);
    } catch (error: any) {
      console.error('[GET /api/students/allocated] Error:', error);
      res.status(500).json({ message: 'Failed to fetch allocated students', error: error.message });
    }
  });

  // Get all allocated students count
  app.get('/api/students/allocated/count', isAuthenticated, async (req: any, res) => {
    try {
      const count = await storage.getAllAllocatedStudentsCount();
      res.json({ count });
    } catch (error: any) {
      console.error('[GET /api/students/allocated/count] Error:', error);
      res.status(500).json({ message: 'Failed to fetch allocated students count', error: error.message });
    }
  });

  // Get all classes
  app.get('/api/all-classes', isAuthenticated, async (req: any, res) => {
    try {
      const classes = await storage.getAllClasses();
      res.json(classes);
    } catch (error: any) {
      console.error('[GET /api/all-classes] Error:', error);
      res.status(500).json({ message: 'Failed to fetch all classes', error: error.message });
    }
  });

  // Re-assign student to a new class
  app.patch('/api/students/:leadId/reassign', isAuthenticated, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.leadId);
      const { oldClassId, newClassId } = req.body;

      if (!oldClassId || !newClassId) {
        return res.status(400).json({ message: 'oldClassId and newClassId are required' });
      }

      await storage.reassignStudent(leadId, parseInt(oldClassId), parseInt(newClassId));
      res.json({ message: 'Student re-assigned successfully' });
    } catch (error: any) {
      console.error('[PATCH /api/students/:leadId/reassign] Error:', error);
      res.status(500).json({ message: 'Failed to re-assign student', error: error.message });
    }
  });

  return httpServer;
}
