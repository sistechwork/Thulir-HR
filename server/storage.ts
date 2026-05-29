import {
  users,
  leads,
  leadHistory,
  uploads,
  notifications,
  chatTranscripts,
  productivityEvents,
  posts,
  postLikes,
  postDislikes,
  postComments,
  classes,
  classStudents,
  attendance,
  marks,
  emailConfig,
  type User,
  type UpsertUser,
  type Lead,
  type InsertLead,
  type LeadHistory,
  type InsertLeadHistory,
  type Upload,
  type InsertUpload,
  type Notification,
  type InsertNotification,
  type ChatTranscript,
  type InsertChatTranscript,
  type ProductivityEvent,
  type InsertProductivityEvent,
  type Class,
  type InsertClass,
  type ClassStudent,
  type InsertClassStudent,
  type Attendance,
  type InsertAttendance,
  type Mark,
  type InsertMark,
  type EmailConfig,
  type InsertEmailConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, inArray, like, or, gte, lte, isNull, aliasedTable } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

export { db, leads, leadHistory, users, uploads, notifications, posts, postLikes, postComments, classes, classStudents, emailConfig };
export { eq, and, or, sql, inArray, desc };

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByRoleAll(role: string): Promise<User[]>;

  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  createLeadsBulk(leadsData: InsertLead[]): Promise<Lead[]>;
  updateLead(id: number, updates: Partial<Lead>): Promise<Lead>;
  updateAllLeadsTotal(totalAmount: string): Promise<void>;
  deleteLead(id: number): Promise<void>;
  deleteLeadWithHistory(leadId: number, historyData: Omit<InsertLeadHistory, 'leadId'>): Promise<void>;
  unassignLeadWithHistory(leadId: number, historyData: Omit<InsertLeadHistory, 'leadId'>): Promise<Lead>;
  getLead(id: number): Promise<Lead | undefined>;
  getLeadsByOwner(ownerId: string): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  assignLead(leadId: number, toUserId: string, changedByUserId: string, reason?: string): Promise<Lead>;
  checkEmailExists(email: string): Promise<boolean>;
  checkEmailExistsBatch(emails: string[]): Promise<Set<string>>;
  searchLeads(filters: {
    status?: string;
    ownerId?: string;
    accountsId?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: number;
    limit?: number;
    unassigned?: boolean;
    excludeCompleted?: boolean;
    previousOwnerId?: string;
    includeHistory?: boolean;
    accountsStatuses?: string[]; // NEW: array of statuses for Accounts users
    statuses?: string[]; // NEW: array of statuses for Session Organizer
  }): Promise<{ leads: Lead[]; total: number; }>;

  // Lead history operations
  createLeadHistory(history: InsertLeadHistory): Promise<LeadHistory>;
  getLeadHistory(leadId: number): Promise<LeadHistory[]>;
  getAllLeadHistory(): Promise<LeadHistory[]>;

  // Upload operations
  createUpload(upload: InsertUpload): Promise<Upload>;
  updateUpload(id: number, updates: Partial<Upload>): Promise<Upload>;
  getUploadsByUser(userId: string): Promise<Upload[]>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;
  deleteUserNotifications(userId: string): Promise<void>;

  // Analytics operations
  getLeadMetrics(): Promise<{
    totalLeads: number;
    activeHR: number;
    completed: number;
    statusDistribution: Record<string, number>;
  }>;
  getTechSupportMetrics(mentorEmail: string): Promise<{
    totalClasses: number;
    totalStudents: number;
    recentRecords: any[];
  }>;

  // Export operations
  getLeadsWithUserInfo(filters: {
    status?: string;
    ownerId?: string;
    accountsId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<any[]>;

  // Chat transcript operations
  createChatTranscript(transcript: InsertChatTranscript): Promise<ChatTranscript>;
  getAllChatTranscripts(): Promise<Array<ChatTranscript & { hrUser: User | null }>>;
  deleteChatTranscript(id: number): Promise<void>;

  // Productivity event operations
  createProductivityEvents(events: InsertProductivityEvent[]): Promise<ProductivityEvent[]>;
  getProductivityEvents(filters: {
    userId?: string;
    eventType?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ProductivityEvent[]>;
  getProductivityStats(userId?: string): Promise<{
    mouseIdleWarnings: number;
    keyboardIdleWarnings: number;
    longKeyPressWarnings: number;
    tabSwitches: number;
    tabSwitchUrls: Array<{ url: string; fromUrl: string; count: number; totalDuration: number; lastVisit: Date }>;
  }>;
  getHRProductivitySummary(): Promise<Array<{
    userId: string;
    userName: string;
    mouseIdleWarnings: number;
    keyboardIdleWarnings: number;
    longKeyPressWarnings: number;
    tabSwitches: number;
  }>>;

  // Class Management operations
  createClass(classData: InsertClass): Promise<Class>;
  getClasses(instructorId?: string): Promise<Class[]>;
  getClassesWithStudentCount(instructorId?: string): Promise<Array<Class & { studentCount: number }>>;
  getClass(id: number): Promise<Class | undefined>;
  updateClass(id: number, updates: Partial<Class>): Promise<Class>;
  deleteClass(id: number): Promise<void>;
  addStudentToClass(classId: number, leadId: number): Promise<ClassStudent | null>;
  removeStudentFromClass(classId: number, leadId: number): Promise<void>;
  getClassStudents(classId: number): Promise<Lead[]>;
  getClassStudentMappings(classId: number): Promise<ClassStudent[]>;
  updateStudentId(classId: number, leadId: number, studentId: string): Promise<void>;
  updateStudentMapping(classId: number, leadId: number, updates: { studentId?: string; joinedAt?: string }): Promise<void>;
  getAllAllocatedStudents(): Promise<any[]>;
  reassignStudent(leadId: number, oldClassId: number, newClassId: number): Promise<void>;
  getAllClasses(): Promise<Class[]>;
  getAllAllocatedStudentsCount(): Promise<number>;

  // Attendance operations
  markAttendance(attendanceData: InsertAttendance): Promise<Attendance>;
  getAttendance(classId: number, date?: string): Promise<Attendance[]>;

  // Marks operations
  addMark(markData: InsertMark): Promise<Mark>;
  getMarks(classId: number): Promise<Mark[]>;

  // Kathaipom (Social Feed) operations
  createPost(userId: string, content: string, imageUrl?: string): Promise<any>;
  getPosts(limit?: number, offset?: number): Promise<any[]>;
  getPostById(postId: number): Promise<any | undefined>;
  deletePost(postId: number): Promise<void>;
  likePost(postId: number, userId: string): Promise<{ liked: boolean }>;
  unlikePost(postId: number, userId: string): Promise<void>;
  dislikePost(postId: number, userId: string): Promise<{ disliked: boolean }>;
  getPostLikes(postId: number): Promise<any[]>;
  addComment(postId: number, userId: string, userName: string, userEmail: string, commentText: string): Promise<any>;
  getPostComments(postId: number): Promise<any[]>;

  // Tech Support Dashboard operations
  getTechSupportMetrics(mentorEmail: string): Promise<{
    totalStudents: number;
    recentRecords: any[];
  }>;

  // Email Configuration operations
  getEmailConfig(userId: string): Promise<EmailConfig | undefined>;
  updateEmailConfig(userId: string, config: any): Promise<EmailConfig>;

  // Notification operations
  getAbsentDetailsForMentor(mentorEmail: string): Promise<Array<{
    leadId: number;
    studentName: string;
    studentEmail: string;
    className: string;
    date: string;
  }>>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeSchema();
  }

  private async initializeSchema() {
    try {
      console.log("[Storage] Starting schema initialization...");

      // Skip ALTER TABLE migrations for PGlite - all columns are already defined in db.ts
      // PGlite's WASM engine crashes on ALTER TABLE and certain DDL that uses
      // Postgres-specific syntax like "GENERATED BY DEFAULT AS IDENTITY"
      const isPglite = !process.env.DATABASE_URL;

      if (isPglite) {
        console.log("[Storage] PGlite mode detected - skipping ALTER TABLE migrations (columns defined in db.ts).");
        console.log("[Storage] Schema initialization completed successfully.");
        return;
      }

      // 1. Ensure basic tables exist and have necessary columns (Postgres only)
      const leadsColumns = [
        { name: 'registration_amount', type: 'decimal(10,2)' },
        { name: 'pending_amount', type: 'decimal(10,2)' },
        { name: 'partial_amount', type: 'decimal(10,2)' },
        { name: 'total_amount', type: "decimal(10,2) DEFAULT '7000.00'" },
        { name: 'transaction_number', type: 'text' },
        { name: 'concession', type: 'decimal(10,2)' },
        { name: 'category', type: 'text' },
        { name: 'program', type: 'text' }
      ];

      for (const col of leadsColumns) {
        try {
          await db.execute(sql.raw(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`));
          console.log(`[Storage] leads.${col.name} verified/added.`);
        } catch (err) {
          console.log(`[Storage] leads.${col.name} column check failed:`, err);
        }
      }

      // 2. Create classes table (depends on users)
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS classes (
            id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
            name text NOT NULL,
            subject text,
            mentor_email text,
            mode text,
            instructor_id varchar NOT NULL REFERENCES users(id),
            created_at timestamp DEFAULT now()
          );
        `);
        console.log("[Storage] classes table verified/created.");
      } catch (err) {
        console.error("[Storage] Failed to create classes table:", err);
      }

      // 3. Create dependent tables in order

      // class_students
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS class_students (
            id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
            class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            student_id text,
            joined_at timestamp DEFAULT now()
          );
        `);
        console.log("[Storage] class_students table verified/created.");
      } catch (err) {
        console.error("[Storage] Failed to create class_students table:", err);
      }

      // attendance
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS attendance (
            id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
            class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            date date NOT NULL,
            status text NOT NULL,
            created_at timestamp DEFAULT now()
          );
        `);
        console.log("[Storage] attendance table verified/created.");
      } catch (err) {
        console.error("[Storage] Failed to create attendance table:", err);
      }

      // marks
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS marks (
            id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
            class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            assessment1 integer DEFAULT 0,
            assessment2 integer DEFAULT 0,
            task integer DEFAULT 0,
            project integer DEFAULT 0,
            final_validation integer DEFAULT 0,
            total integer DEFAULT 0,
            created_at timestamp DEFAULT now(),
            updated_at timestamp DEFAULT now()
          );
        `);
        console.log("[Storage] marks table verified/created.");
      } catch (err) {
        console.error("[Storage] Failed to create marks table:", err);
      }

      // 4. Create email_config
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS email_config (
            id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
            user_id varchar UNIQUE REFERENCES users(id),
            smtp_email text NOT NULL,
            app_password text NOT NULL,
            smtp_server text NOT NULL,
            smtp_port integer NOT NULL DEFAULT 587,
            is_enabled boolean DEFAULT true,
            updated_at timestamp DEFAULT now()
          );
        `);
        console.log("[Storage] email_config table verified/created.");
      } catch (tableErr) {
        try {
          await db.execute(sql`
            ALTER TABLE email_config ADD COLUMN IF NOT EXISTS user_id varchar REFERENCES users(id);
          `);
          console.log("[Storage] email_config updated.");
        } catch (colErr) {
          console.log("[Storage] email_config update check failed:", colErr);
        }
      }

      console.log("[Storage] Schema initialization completed successfully.");
    } catch (error) {
      console.error("[Storage] Failed to initialize schema:", error);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          role: userData.role,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: UpsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(and(
      eq(users.role, role as any),
      eq(users.isActive, true)
    ));
  }

  async getUsersByRoleAll(role: string): Promise<User[]> {
    return await db.select().from(users).where(
      eq(users.role, role as any)
    );
  }

  // Lead operations
  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async createLeadsBulk(leadsData: InsertLead[]): Promise<Lead[]> {
    if (leadsData.length === 0) return [];

    // Chunk size to avoid PostgreSQL parameter limit (65535)
    // Assuming ~20 columns per row, 50 rows = 1000 parameters, well within safety
    const CHUNK_SIZE = 50;
    const results: Lead[] = [];

    console.log(`Starting bulk insert of ${leadsData.length} leads in chunks of ${CHUNK_SIZE} `);

    for (let i = 0; i < leadsData.length; i += CHUNK_SIZE) {
      const chunk = leadsData.slice(i, i + CHUNK_SIZE);
      console.log(`Inserting chunk ${Math.floor(i / CHUNK_SIZE) + 1} /${Math.ceil(leadsData.length / CHUNK_SIZE)}`);

      const chunkResults = await db.insert(leads).values(chunk).returning();
      results.push(...chunkResults);
    }

    console.log(`Bulk insert completed.Total inserted: ${results.length} `);
    return results;
  }

  async updateLead(id: number, updates: Partial<Lead>): Promise<Lead> {
    // Sanitize empty strings to null for date/optional fields
    const sanitizedUpdates = { ...updates };

    // Convert empty strings to null for specific fields
    if (sanitizedUpdates.walkinDate === '') sanitizedUpdates.walkinDate = null;
    if (sanitizedUpdates.walkinTime === '') sanitizedUpdates.walkinTime = null;
    if (sanitizedUpdates.phone === '') sanitizedUpdates.phone = null;
    if (sanitizedUpdates.domain === '') sanitizedUpdates.domain = null;
    if (sanitizedUpdates.notes === '') sanitizedUpdates.notes = null;
    if (sanitizedUpdates.sessionDays === '') sanitizedUpdates.sessionDays = null;
    if (sanitizedUpdates.timing === '') sanitizedUpdates.timing = null;
    if (sanitizedUpdates.category === '') sanitizedUpdates.category = null;
    if (sanitizedUpdates.program === '') sanitizedUpdates.program = null;
    // Dynamic fields from bulk import
    if (sanitizedUpdates.yearOfPassing === '') sanitizedUpdates.yearOfPassing = null;
    if (sanitizedUpdates.collegeName === '') sanitizedUpdates.collegeName = null;
    // HR workflow field - registrationAmount is already handled in routes.ts
    if (sanitizedUpdates.registrationAmount === '') sanitizedUpdates.registrationAmount = null;
    if (sanitizedUpdates.totalAmount === '') sanitizedUpdates.totalAmount = null;

    const [lead] = await db
      .update(leads)
      .set({
        ...sanitizedUpdates,
        totalAmount: sanitizedUpdates.totalAmount, // Explicitly set to ensure mapping
        updatedAt: new Date()
      })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async updateAllLeadsTotal(totalAmount: string): Promise<void> {
    await db
      .update(leads)
      .set({ totalAmount, updatedAt: new Date() });
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  async deleteLeadWithHistory(leadId: number, historyData: Omit<InsertLeadHistory, 'leadId'>): Promise<void> {
    await db.transaction(async (tx: any) => {
      // Create final history entry for the deletion
      await tx.insert(leadHistory).values({
        ...historyData,
        leadId: leadId
      });

      // Delete all existing lead history records for this lead (to avoid foreign key constraint)
      await tx.delete(leadHistory).where(eq(leadHistory.leadId, leadId));

      // Finally delete the lead
      await tx.delete(leads).where(eq(leads.id, leadId));
    });
  }

  async unassignLeadWithHistory(leadId: number, historyData: Omit<InsertLeadHistory, 'leadId'>): Promise<Lead> {
    return await db.transaction(async (tx: any) => {
      // Create history entry first
      await tx.insert(leadHistory).values({
        ...historyData,
        leadId: leadId
      });

      // Unassign the lead by setting currentOwnerId to null and reset status to the newStatus
      const [unassignedLead] = await tx
        .update(leads)
        .set({
          currentOwnerId: null,
          lastOwnerId: historyData.fromUserId,
          status: historyData.newStatus || 'new',
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId))
        .returning();

      return unassignedLead;
    });
  }

  async checkEmailExists(email: string): Promise<boolean> {
    if (!email || email.trim() === '') {
      return false;
    }

    const trimmedEmail = email.trim();

    try {
      const result = await db
        .select({ id: leads.id })
        .from(leads)
        .where(sql`LOWER(${leads.email}) = LOWER(${trimmedEmail})`)
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error(`Error checking email existence for ${trimmedEmail}: `, error);
      return false;
    }
  }

  async checkEmailExistsBatch(emails: string[]): Promise<Set<string>> {
    if (!emails || emails.length === 0) {
      return new Set();
    }

    try {
      // Filter out empty emails and normalize
      const validEmails = emails
        .filter(e => e && e.trim() !== '')
        .map(e => e.trim().toLowerCase());

      if (validEmails.length === 0) {
        return new Set();
      }

      const existingEmails = new Set<string>();

      // Process in chunks to avoid parameter limits (Postgres limit ~65535 parameters)
      // Drizzle might add multiple params per value, so keep chunk size safe
      const CHUNK_SIZE = 500;

      // Remove duplicates from the input list to reduce query size
      const uniqueEmails = Array.from(new Set(validEmails));

      for (let i = 0; i < uniqueEmails.length; i += CHUNK_SIZE) {
        const chunk = uniqueEmails.slice(i, i + CHUNK_SIZE);

        // Use inArray to find matching emails in this chunk
        const results = await db
          .select({ email: leads.email })
          .from(leads)
          .where(sql`LOWER(${leads.email}) IN ${chunk} `);

        results.forEach((row: { email: string | null }) => {
          if (row.email) {
            existingEmails.add(row.email.toLowerCase());
          }
        });
      }

      return existingEmails;
    } catch (error) {
      console.error(`Error batch checking email existence: `, error);
      // Fallback: return empty set, bulk upload will verify individually or fail on insert
      return new Set();
    }
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadsByOwner(ownerId: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.currentOwnerId, ownerId));
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.status, status));
  }

  async assignLead(leadId: number, toUserId: string, changedByUserId: string, reason?: string): Promise<Lead> {
    return await db.transaction(async (tx: any) => {
      // Get the current lead and check if it's available for assignment
      const [currentLead] = await tx.select().from(leads).where(eq(leads.id, leadId));

      if (!currentLead) {
        throw new Error("Lead not found");
      }

      const previousOwnerId = currentLead.currentOwnerId;

      // Determine if this is an HR self-assignment (requires unassigned lead)
      const isHRSelfAssign = toUserId === changedByUserId && previousOwnerId === null;

      // For HR self-assignment, use atomic update with condition to prevent race conditions
      if (isHRSelfAssign) {
        const result = await tx
          .update(leads)
          .set({
            currentOwnerId: toUserId,
            updatedAt: new Date()
          })
          .where(and(eq(leads.id, leadId), isNull(leads.currentOwnerId)))
          .returning();

        if (result.length === 0) {
          // Lead was already assigned by another HR user
          throw new Error("Lead is already assigned to another user");
        }

        const [updatedLead] = result;

        // Create history entry for the assignment
        await tx.insert(leadHistory).values({
          leadId: leadId,
          fromUserId: previousOwnerId,
          toUserId: toUserId,
          previousStatus: currentLead.status,
          newStatus: currentLead.status, // Status remains the same
          changeReason: reason || "Lead assigned",
          changeData: {
            action: "assignment",
            previousOwner: previousOwnerId,
            newOwner: toUserId
          },
          changedByUserId: changedByUserId,
        });

        return updatedLead;
      } else {
        // For manager/admin reassignments, allow unconditional updates
        const [updatedLead] = await tx
          .update(leads)
          .set({
            currentOwnerId: toUserId,
            updatedAt: new Date()
          })
          .where(eq(leads.id, leadId))
          .returning();

        // Create history entry for the assignment
        await tx.insert(leadHistory).values({
          leadId: leadId,
          fromUserId: previousOwnerId,
          toUserId: toUserId,
          previousStatus: currentLead.status,
          newStatus: currentLead.status, // Status remains the same
          changeReason: reason || "Lead assigned",
          changeData: {
            action: "assignment",
            previousOwner: previousOwnerId,
            newOwner: toUserId
          },
          changedByUserId: changedByUserId,
        });

        return updatedLead;
      }
    });
  }

  async searchLeads(filters: {
    status?: string;
    ownerId?: string;
    accountsId?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: number;
    limit?: number;
    unassigned?: boolean;
    excludeCompleted?: boolean;
    excludeAccountsPending?: boolean;
    previousOwnerId?: string;
    includeHistory?: boolean;
    showAllCompleted?: boolean;
    category?: string;
    includePreviouslyOwned?: string;
    accountsStatuses?: string[]; // NEW: array of statuses for Accounts users
    statuses?: string[]; // NEW: array of statuses for Session Organizer
    teamMemberIds?: string[]; // NEW: array of team member IDs for HR Team Lead
    hrFilterId?: number | string; // NEW: specific HR filter
  }): Promise<{ leads: any[]; total: number; }> {
    const { status, ownerId, accountsId, fromDate, toDate, search, page = 1, limit = 20, unassigned, excludeCompleted, excludeAccountsPending, previousOwnerId, includeHistory, showAllCompleted, category, includePreviouslyOwned, accountsStatuses, statuses, teamMemberIds, hrFilterId } = filters;

    // Join with users table to get current owner details
    let query = db.select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      location: leads.location,
      degree: leads.degree,
      domain: leads.domain,
      sessionDays: leads.sessionDays,
      walkinDate: leads.walkinDate,
      walkinTime: leads.walkinTime,
      timing: leads.timing,
      currentOwnerId: leads.currentOwnerId,
      sourceManagerId: leads.sourceManagerId,
      status: leads.status,
      isActive: leads.isActive,
      notes: leads.notes,
      yearOfPassing: leads.yearOfPassing,
      collegeName: leads.collegeName,
      registrationAmount: leads.registrationAmount,
      pendingAmount: leads.pendingAmount,
      partialAmount: leads.partialAmount,
      transactionNumber: leads.transactionNumber,
      concession: leads.concession,
      totalAmount: leads.totalAmount,
      program: leads.program,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      // Include current owner details
      currentOwner: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        username: users.username
      },
      // Include last owner details
      lastOwner: {
        id: sql`${leads.lastOwnerId}`,
        firstName: sql`last_owner_users.first_name`,
        lastName: sql`last_owner_users.last_name`,
        fullName: sql`last_owner_users.full_name`,
        email: sql`last_owner_users.email`,
        role: sql`last_owner_users.role`,
        username: sql`last_owner_users.username`
      }
    })
      .from(leads)
      .leftJoin(users, eq(leads.currentOwnerId, users.id))
      .leftJoin(sql`users as last_owner_users`, sql`${leads.lastOwnerId} = last_owner_users.id`);

    let countQuery = db.select({ count: count().as('count') }).from(leads);

    const conditions = [];

    if (status) {
      conditions.push(eq(leads.status, status));
    }

    // NEW: Support for multiple statuses (for Accounts users)
    if (accountsStatuses && Array.isArray(accountsStatuses) && accountsStatuses.length > 0) {
      console.log(`[searchLeads] Using accountsStatuses filter: ${JSON.stringify(accountsStatuses)} `);
      conditions.push(inArray(leads.status, accountsStatuses));
    }

    // NEW: Support for statuses filter (for Session Organizer)
    if (statuses && Array.isArray(statuses) && statuses.length > 0) {
      console.log(`[searchLeads] Using statuses filter: ${JSON.stringify(statuses)} `);
      conditions.push(inArray(leads.status, statuses));
    }

    console.log(`[searchLeads] Filters received: `, JSON.stringify({ status, ownerId, accountsId, accountsStatuses, statuses, excludeCompleted, excludeAccountsPending }));

    // Handle excludeCompleted filter for HR "My Leads"
    if (excludeCompleted) {
      conditions.push(sql`${leads.status} != 'completed'`);
    }

    console.log(`[searchLeads] Evaluating owner filters. unassigned=${unassigned}, hrFilterId=${hrFilterId}, teamMemberIds=${teamMemberIds?.length}, ownerId=${ownerId}`);

    // Handle excludeAccountsPending filter for HR "My Leads"
    if (excludeAccountsPending) {
      conditions.push(sql`${leads.status} != 'accounts_pending'`);
    }

    // Handle special unassigned filter for HR users
    if (unassigned) {
      console.log(`[searchLeads] Applied unassigned filter`);
      conditions.push(isNull(leads.currentOwnerId));
    } else if (hrFilterId) {
      console.log(`[searchLeads] Applied hrFilterId filter for ID: ${hrFilterId}`);
      // If specific owner selected via HR filter in Lead Management, show both current and last owner
      conditions.push(
        or(
          eq(leads.currentOwnerId, hrFilterId as string),
          eq(leads.lastOwnerId, hrFilterId as string)
        )
      );
    } else if (teamMemberIds && teamMemberIds.length > 0) {
      conditions.push(
        or(
          and(isNull(leads.currentOwnerId), isNull(leads.lastOwnerId)),
          and(isNull(leads.currentOwnerId), inArray(leads.lastOwnerId, teamMemberIds)),
          inArray(leads.currentOwnerId, teamMemberIds)
        )
      );
    } else if ((!accountsStatuses || accountsStatuses.length === 0) && (!statuses || statuses.length === 0)) {
      // Only apply owner filtering if NEITHER accountsStatuses NOR statuses is set
      // When either is set, we want ALL leads with those statuses regardless of owner
      if (accountsId) {
        // For accountsId, show leads assigned to this user OR leads with 'accounts_pending' status
        conditions.push(
          or(
            eq(leads.currentOwnerId, accountsId),
            eq(leads.status, 'accounts_pending')
          )
        );
      } else if (ownerId) {
        conditions.push(eq(leads.currentOwnerId, ownerId));
      }
    }
    // When accountsStatuses is set, we skip owner filtering entirely to show ALL leads with those statuses

    // Handle includePreviouslyOwned filter (leads user has touched in the past)
    if (includePreviouslyOwned) {
      try {
        const historicalLeadIdsResult = await db
          .select({ leadId: leadHistory.leadId })
          .from(leadHistory)
          .where(or(
            eq(leadHistory.fromUserId, includePreviouslyOwned),
            eq(leadHistory.toUserId, includePreviouslyOwned)
          ));

        const historicalLeadIds = historicalLeadIdsResult.map((r: any) => r.leadId);

        if (historicalLeadIds.length > 0) {
          // If we already have an ownerId filter, we want leads that are EITHER currently owned OR previously owned
          const currentOwnerFilter = conditions.find(c => c && (c as any).column === leads.currentOwnerId);
          // This is a bit complex for drizzle simple filter array. 
          // We'll replace the last owner-specific condition with an OR if it exists.

          // Actually, let's just add it as an OR to the overall conditions if we have ownerId
          if (ownerId || accountsId) {
            // We need to group the current owner check and the historical check in an OR
            // But searchLeads is already complex. Let's simplify.
            // We'll just add it to the list of IDs if we are looking for "my" leads.
          }

          // Simple approach: if includePreviouslyOwned is set, we use it to expand the search results
          // to include leads the user has touched.
          conditions.push(or(
            ownerId ? eq(leads.currentOwnerId, ownerId) : sql`false`,
            accountsId ? eq(leads.currentOwnerId, accountsId) : sql`false`,
            inArray(leads.id, historicalLeadIds)
          ));
        }
      } catch (err) {
        console.error("Error in includePreviouslyOwned filter:", err);
      }
    }

    // Handle previousOwnerId filter for completed leads (find leads completed by specific HR user)
    // OR showAllCompleted for managers to see all completed leads  
    if (previousOwnerId || showAllCompleted) {
      try {
        let completedLeadIds;

        if (showAllCompleted) {
          // Manager access - show all completed leads by any HR user
          const result = await db.execute(sql`SELECT DISTINCT lead_id FROM lead_history WHERE new_status IN('completed', 'pending', 'accounts_pending')`);
          completedLeadIds = result.rows.map((row: any) => ({ leadId: row.lead_id || row.leadId }));
        } else {
          // HR access - show leads completed by this specific user OR all leads pending accounts
          // Accounts access - show only truly completed leads (exclude accounts_pending when flag is set)

          if (excludeAccountsPending) {
            // For Accounts users: EXCLUDE accounts_pending from completion
            const querySql = sql`
              SELECT DISTINCT lead_id 
              FROM lead_history
WHERE(changed_by_user_id = ${previousOwnerId} OR from_user_id = ${previousOwnerId})
              AND new_status IN('completed', 'pending', 'ready_for_class')
  `;
            const result = await db.execute(querySql);
            completedLeadIds = result.rows.map((row: any) => ({
              leadId: parseInt(row.lead_id || row.leadId)
            })).filter((r: { leadId: number }) => !isNaN(r.leadId));

            console.log(`[storage.searchLeads] Found ${completedLeadIds.length} completed leads(excluding accounts_pending) for user ${previousOwnerId}`);
          } else {
            // For HR users: INCLUDE accounts_pending in completion
            const querySql = sql`
              SELECT DISTINCT lead_id 
              FROM lead_history
WHERE(changed_by_user_id = ${previousOwnerId} OR from_user_id = ${previousOwnerId})
              AND new_status IN('completed', 'pending', 'accounts_pending', 'ready_for_class')
UNION
              SELECT id as lead_id FROM leads WHERE status = 'accounts_pending'
  `;
            const result = await db.execute(querySql);
            completedLeadIds = result.rows.map((row: any) => ({
              leadId: parseInt(row.lead_id || row.leadId)
            })).filter((r: { leadId: number }) => !isNaN(r.leadId));

            console.log(`[storage.searchLeads] Found ${completedLeadIds.length} leads(history + accounts_pending) for user ${previousOwnerId}`);
          }
        }

        const leadIds = completedLeadIds.map((row: any) => row.leadId as number).filter((value: number, index: number, self: number[]) => self.indexOf(value) === index);

        if (leadIds.length > 0) {
          conditions.push(inArray(leads.id, leadIds));
        } else {
          // No leads found, return empty result
          return { leads: [], total: 0 };
        }
      } catch (error) {
      }
    }

    if (category) {
      conditions.push(eq(leads.category, category as string));
    }

    if (fromDate) {
      conditions.push(gte(leads.createdAt, new Date(fromDate as string)));
    }

    if (toDate) {
      // Include end of day for toDate to make it inclusive
      const endOfDay = new Date(toDate + 'T23:59:59.999Z');
      conditions.push(lte(leads.createdAt, endOfDay));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          sql`${leads.name} ILIKE ${searchPattern}`,
          sql`${leads.email} ILIKE ${searchPattern}`,
          sql`${leads.phone} ILIKE ${searchPattern}`,
          sql`${leads.location} ILIKE ${searchPattern}`,
          sql`${leads.degree} ILIKE ${searchPattern}`,
          sql`${leads.domain} ILIKE ${searchPattern}`,
          sql`${leads.yearOfPassing} ILIKE ${searchPattern}`,
          sql`${leads.collegeName} ILIKE ${searchPattern}`,
          sql`${leads.notes} ILIKE ${searchPattern}`
        )
      );
    }


    console.log(`[searchLeads] Total conditions: ${conditions.length} `);

    if (conditions.length > 0) {
      // Filter out any undefined or null conditions to prevent Drizzle errors
      const validConditions = conditions.filter(c => c !== undefined && c !== null);
      console.log(`[searchLeads] Valid conditions: ${validConditions.length} `);
      if (validConditions.length > 0) {
        const whereClause = and(...validConditions);
        query = query.where(whereClause);
        countQuery = countQuery.where(whereClause);
      }
    }

    const [leadsResult, totalResult] = await Promise.all([
      query.limit(limit).offset((page - 1) * limit)
        .orderBy(
          sql`CASE WHEN ${leads.currentOwnerId} IS NOT NULL OR ${leads.lastOwnerId} IS NOT NULL THEN 1 ELSE 0 END ASC`,
          desc(leads.updatedAt)
        ),
      countQuery
    ]);

    console.log(`[searchLeads] Query returned ${leadsResult.length} leads, total count: ${totalResult[0].count} `);

    const processedLeads = leadsResult.map((lead: any) => ({
      ...lead,
      currentOwner: lead.currentOwner?.id ? lead.currentOwner : null,
      lastOwner: lead.lastOwner?.id ? lead.lastOwner : null
    }));

    return {
      leads: processedLeads,
      total: totalResult[0].count
    };
  }

  // Lead history operations
  async createLeadHistory(history: InsertLeadHistory): Promise<LeadHistory> {
    const [newHistory] = await db.insert(leadHistory).values(history).returning();
    return newHistory;
  }

  async getLeadHistory(leadId: number): Promise<LeadHistory[]> {
    return await db
      .select()
      .from(leadHistory)
      .where(eq(leadHistory.leadId, leadId))
      .orderBy(desc(leadHistory.changedAt));
  }

  async getAllLeadHistory(): Promise<LeadHistory[]> {
    return await db
      .select()
      .from(leadHistory)
      .orderBy(desc(leadHistory.changedAt));
  }

  // Upload operations
  async createUpload(upload: InsertUpload): Promise<Upload> {
    const [newUpload] = await db.insert(uploads).values(upload).returning();
    return newUpload;
  }

  async updateUpload(id: number, updates: Partial<Upload>): Promise<Upload> {
    const [upload] = await db
      .update(uploads)
      .set(updates)
      .where(eq(uploads.id, id))
      .returning();
    return upload;
  }

  async getUploadsByUser(userId: string): Promise<Upload[]> {
    return await db
      .select()
      .from(uploads)
      .where(eq(uploads.uploaderId, userId))
      .orderBy(desc(uploads.uploadedAt));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async deleteUserNotifications(userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
  }

  // Analytics operations
  async getLeadMetrics(): Promise<{
    totalLeads: number;
    activeHR: number;
    completed: number;
    statusDistribution: Record<string, number>;
  }> {
    // Total leads query
    const [totalLeadsResult] = await db.select({ count: count() }).from(leads);

    // Active HR leads query
    const baseActiveConditions = and(
      eq(leads.isActive, true),
      inArray(leads.status, ['new', 'register', 'scheduled', 'not_available', 'reschedule'])
    );
    const [activeHRResult] = await db.select({ count: count() }).from(leads).where(baseActiveConditions);

    // Completed leads query
    const [completedResult] = await db.select({ count: count() }).from(leads).where(eq(leads.status, 'completed'));

    // Status distribution query
    const statusDistributionResult = await db
      .select({
        status: leads.status,
        count: count()
      })
      .from(leads)
      .groupBy(leads.status);

    const statusDistribution: Record<string, number> = {};
    statusDistributionResult.forEach((row: any) => {
      statusDistribution[row.status] = row.count;
    });

    return {
      totalLeads: totalLeadsResult.count,
      activeHR: activeHRResult.count,
      completed: completedResult.count,
      statusDistribution
    };
  }

  // Export operations - get leads with user information
  async getLeadsWithUserInfo(filters: {
    status?: string;
    ownerId?: string;
    accountsId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<any[]> {
    const { status, ownerId, accountsId, fromDate, toDate, limit = 10000 } = filters;

    // Get leads first, then fetch user info separately to avoid complex joins
    const searchResult = await this.searchLeads({
      status,
      ownerId,
      accountsId,
      fromDate,
      toDate,
      limit
    });

    const leadsWithUsers = [];

    for (const lead of searchResult.leads) {
      // Get current owner info
      let hrName = null;
      let accountsHandlerName = null;
      if (lead.currentOwnerId) {
        const currentOwner = await this.getUser(lead.currentOwnerId);
        if (currentOwner) {
          const fullName = `${currentOwner.firstName || ''} ${currentOwner.lastName || ''} `.trim();
          if (currentOwner.role === 'hr') {
            hrName = fullName;
          } else if (currentOwner.role === 'accounts') {
            accountsHandlerName = fullName;
          }
        }
      }

      // Get manager info
      let managerName = null;
      if (lead.sourceManagerId) {
        const manager = await this.getUser(lead.sourceManagerId);
        if (manager) {
          managerName = `${manager.firstName || ''} ${manager.lastName || ''} `.trim();
        }
      }

      leadsWithUsers.push({
        ...lead,
        hrName,
        accountsHandlerName,
        managerName
      });
    }

    return leadsWithUsers;
  }


  // Chat transcript operations
  async createChatTranscript(transcript: InsertChatTranscript): Promise<ChatTranscript> {
    const [newTranscript] = await db.insert(chatTranscripts).values(transcript).returning();
    return newTranscript;
  }

  async getAllChatTranscripts(): Promise<Array<ChatTranscript & { hrUser: User | null }>> {
    const result = await db
      .select({
        id: chatTranscripts.id,
        hrUserId: chatTranscripts.hrUserId,
        question: chatTranscripts.question,
        answer: chatTranscripts.answer,
        category: chatTranscripts.category,
        createdAt: chatTranscripts.createdAt,
        hrUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          fullName: users.fullName,
          role: users.role,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
          passwordHash: users.passwordHash,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(chatTranscripts)
      .leftJoin(users, eq(chatTranscripts.hrUserId, users.id))
      .orderBy(desc(chatTranscripts.createdAt));

    return result.map((row: any) => ({
      id: row.id,
      hrUserId: row.hrUserId,
      question: row.question,
      answer: row.answer,
      category: row.category,
      createdAt: row.createdAt,
      hrUser: row.hrUser?.id ? row.hrUser : null
    }));
  }

  async deleteChatTranscript(id: number): Promise<void> {
    await db.delete(chatTranscripts).where(eq(chatTranscripts.id, id));
  }

  // Productivity event operations
  async createProductivityEvents(events: InsertProductivityEvent[]): Promise<ProductivityEvent[]> {
    if (events.length === 0) return [];
    const newEvents = await db.insert(productivityEvents).values(events).returning();
    return newEvents;
  }

  async getProductivityEvents(filters: {
    userId?: string;
    eventType?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ProductivityEvent[]> {
    const { userId, eventType, fromDate, toDate } = filters;
    const conditions = [];

    if (userId) {
      conditions.push(eq(productivityEvents.userId, userId));
    }
    if (eventType) {
      conditions.push(eq(productivityEvents.eventType, eventType as any));
    }
    if (fromDate) {
      conditions.push(gte(productivityEvents.createdAt, new Date(fromDate)));
    }
    if (toDate) {
      conditions.push(lte(productivityEvents.createdAt, new Date(toDate)));
    }

    let query = db.select().from(productivityEvents);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(productivityEvents.createdAt));
  }

  async getProductivityStats(userId?: string): Promise<{
    mouseIdleWarnings: number;
    keyboardIdleWarnings: number;
    longKeyPressWarnings: number;
    tabSwitches: number;
    tabSwitchUrls: Array<{ url: string; fromUrl: string; count: number; totalDuration: number; lastVisit: Date }>;
  }> {
    const baseCondition = userId ? eq(productivityEvents.userId, userId) : sql`true`;

    const [mouseIdle] = await db
      .select({ count: count() })
      .from(productivityEvents)
      .where(and(baseCondition, eq(productivityEvents.eventType, 'mouseIdleWarning')));

    const [keyboardIdle] = await db
      .select({ count: count() })
      .from(productivityEvents)
      .where(and(baseCondition, eq(productivityEvents.eventType, 'keyboardIdleWarning')));

    const [longKeyPress] = await db
      .select({ count: count() })
      .from(productivityEvents)
      .where(and(baseCondition, eq(productivityEvents.eventType, 'longKeyPressWarning')));

    const [tabSwitch] = await db
      .select({ count: count() })
      .from(productivityEvents)
      .where(and(baseCondition, eq(productivityEvents.eventType, 'tabSwitch')));

    const tabSwitchEvents = await db
      .select()
      .from(productivityEvents)
      .where(and(baseCondition, eq(productivityEvents.eventType, 'tabSwitch')))
      .orderBy(desc(productivityEvents.createdAt));

    const urlMap = new Map<string, { fromUrl: string; count: number; totalDuration: number; lastVisit: Date }>();
    for (const event of tabSwitchEvents) {
      const metadata = event.metadata as { url?: string; fromUrl?: string; duration?: number } | null;
      const url = metadata?.url || 'Unknown';
      const fromUrl = metadata?.fromUrl || 'Unknown page';
      const duration = metadata?.duration || 0;
      const key = `${fromUrl} `;
      const existing = urlMap.get(key);
      if (existing) {
        existing.count++;
        existing.totalDuration += duration;
        if (event.createdAt && event.createdAt > existing.lastVisit) {
          existing.lastVisit = event.createdAt;
        }
      } else {
        urlMap.set(key, { fromUrl: fromUrl, count: 1, totalDuration: duration, lastVisit: event.createdAt! });
      }
    }

    const tabSwitchUrls = Array.from(urlMap.entries()).map(([key, data]) => ({
      url: key,
      fromUrl: data.fromUrl,
      count: data.count,
      totalDuration: data.totalDuration,
      lastVisit: data.lastVisit
    }));

    return {
      mouseIdleWarnings: mouseIdle.count,
      keyboardIdleWarnings: keyboardIdle.count,
      longKeyPressWarnings: longKeyPress.count,
      tabSwitches: tabSwitch.count,
      tabSwitchUrls
    };
  }

  async getHRProductivitySummary(): Promise<Array<{
    userId: string;
    userName: string;
    mouseIdleWarnings: number;
    keyboardIdleWarnings: number;
    longKeyPressWarnings: number;
    tabSwitches: number;
  }>> {
    const hrUsers = await db.select().from(users).where(
      and(eq(users.role, 'hr'), eq(users.isActive, true))
    );

    const summaries = [];
    for (const user of hrUsers) {
      const stats = await this.getProductivityStats(user.id);
      summaries.push({
        userId: user.id,
        userName: user.fullName || user.username || user.email || 'Unknown',
        mouseIdleWarnings: stats.mouseIdleWarnings,
        keyboardIdleWarnings: stats.keyboardIdleWarnings,
        longKeyPressWarnings: stats.longKeyPressWarnings,
        tabSwitches: stats.tabSwitches
      });
    }

    return summaries;
  }

  // Kathaipom (Social Feed) operations
  async createPost(userId: string, content: string, imageUrl?: string): Promise<any> {
    const result: any = await db.execute(sql`
      INSERT INTO posts(user_id, content, image_url)
VALUES(${userId}, ${content}, ${imageUrl || null})
RETURNING *
  `);
    return result.rows[0];
  }

  async getPosts(limit: number = 50, offset: number = 0, viewerUserId?: string): Promise<any[]> {
    const result: any = await db.execute(sql`
SELECT
p.*,
  u.id as author_user_id,
  u.full_name as author_name,
  u.email as author_email,
  (SELECT COUNT(*)::int FROM post_likes WHERE post_id = p.id) as like_count,
    (SELECT COUNT(*)::int FROM post_dislikes WHERE post_id = p.id) as dislike_count,
    (SELECT COUNT(*)::int FROM post_comments WHERE post_id = p.id) as comment_count,
    ${viewerUserId ? sql`(SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ${viewerUserId})) as user_has_liked,` : sql`false as user_has_liked,`}
    ${viewerUserId ? sql`(SELECT EXISTS(SELECT 1 FROM post_dislikes WHERE post_id = p.id AND user_id = ${viewerUserId})) as user_has_disliked` : sql`false as user_has_disliked`}
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
`);
    return result.rows;
  }

  async getPostById(postId: number, viewerUserId?: string): Promise<any | undefined> {
    const result: any = await db.execute(sql`
SELECT
p.*,
  u.id as author_user_id,
  u.full_name as author_name,
  u.email as author_email,
  (SELECT COUNT(*)::int FROM post_likes WHERE post_id = p.id) as like_count,
    (SELECT COUNT(*)::int FROM post_dislikes WHERE post_id = p.id) as dislike_count,
    (SELECT COUNT(*)::int FROM post_comments WHERE post_id = p.id) as comment_count,
    ${viewerUserId ? sql`(SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ${viewerUserId})) as user_has_liked,` : sql`false as user_has_liked,`}
    ${viewerUserId ? sql`(SELECT EXISTS(SELECT 1 FROM post_dislikes WHERE post_id = p.id AND user_id = ${viewerUserId})) as user_has_disliked` : sql`false as user_has_disliked`}
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ${postId}
`);
    return result.rows[0];
  }

  async deletePost(postId: number): Promise<void> {
    await db.execute(sql`DELETE FROM posts WHERE id = ${postId} `);
  }

  async likePost(postId: number, userId: string): Promise<{ liked: boolean }> {
    const logPath = path.join(process.cwd(), 'kathaipom_debug.log');
    try {
      // Mutually exclusive: remove dislike if liking
      await db.execute(sql`DELETE FROM post_dislikes WHERE post_id = ${postId} AND user_id = ${userId}`);

      // Check if already liked
      const existing: any = await db.execute(sql`
SELECT * FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}
`);

      if (existing.rows && existing.rows.length > 0) {
        // Unlike
        await db.execute(sql`
          DELETE FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}
`);
        return { liked: false };
      } else {
        // Like
        await db.execute(sql`
          INSERT INTO post_likes(post_id, user_id)
VALUES(${postId}, ${userId})
  `);
        return { liked: true };
      }
    } catch (err: any) {
      fs.appendFileSync(logPath, `[STORAGE] ERROR in likePost: ${err.message} \n`);
      throw err;
    }
  }

  async dislikePost(postId: number, userId: string): Promise<{ disliked: boolean }> {
    const logPath = path.join(process.cwd(), 'kathaipom_debug.log');
    try {
      // Mutually exclusive: remove like if disliking
      await db.execute(sql`DELETE FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}`);

      // Check if already disliked
      const existing: any = await db.execute(sql`
SELECT * FROM post_dislikes WHERE post_id = ${postId} AND user_id = ${userId}
`);

      if (existing.rows && existing.rows.length > 0) {
        // Remove dislike
        await db.execute(sql`
          DELETE FROM post_dislikes WHERE post_id = ${postId} AND user_id = ${userId}
`);
        return { disliked: false };
      } else {
        // Dislike
        await db.execute(sql`
          INSERT INTO post_dislikes(post_id, user_id)
VALUES(${postId}, ${userId})
  `);
        return { disliked: true };
      }
    } catch (err: any) {
      fs.appendFileSync(logPath, `[STORAGE] ERROR in dislikePost: ${err.message} \n`);
      throw err;
    }
  }

  async unlikePost(postId: number, userId: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}
`);
  }

  async getPostLikes(postId: number): Promise<any[]> {
    const result: any = await db.execute(sql`
SELECT * FROM post_likes WHERE post_id = ${postId}
`);
    return result.rows;
  }

  async addComment(postId: number, userId: string, userName: string, userEmail: string, commentText: string): Promise<any> {
    const result: any = await db.execute(sql`
      INSERT INTO post_comments(post_id, user_id, comment_text)
VALUES(${postId}, ${userId}, ${commentText})
RETURNING *
  `);

    const comment = result.rows[0];
    return {
      ...comment,
      user_name: userName,
      user_email: userEmail
    };
  }

  async getPostComments(postId: number): Promise<any[]> {
    const result: any = await db.execute(sql`
SELECT
c.*,
  u.full_name as user_name,
  u.email as user_email
      FROM post_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ${postId}
      ORDER BY c.created_at DESC
    `);

    // Format for client expectation
    return result.rows.map((row: any) => ({
      id: row.id,
      post_id: row.post_id,
      user_id: row.user_id,
      comment_text: row.comment_text,
      created_at: row.created_at,
      user_name: row.user_name || 'User',
      user_email: row.user_email || ''
    }));
  }

  async deleteComment(commentId: number): Promise<void> {
    await db.execute(sql`DELETE FROM post_comments WHERE id = ${commentId} `);
  }

  // Class Management operations
  async createClass(classData: InsertClass): Promise<Class> {
    try {
      console.log('[Storage] Creating class with data:', JSON.stringify(classData));
      const [newClass] = await db.insert(classes).values(classData).returning();
      console.log('[Storage] Class created in DB:', JSON.stringify(newClass));
      return newClass;
    } catch (error: any) {
      console.error('[Storage] Error creating class:', error);
      throw error;
    }
  }

  async getClasses(instructorId?: string): Promise<Class[]> {
    if (instructorId) {
      return await db.select().from(classes).where(eq(classes.instructorId, instructorId)).orderBy(desc(classes.createdAt));
    }
    return await db.select().from(classes).orderBy(desc(classes.createdAt));
  }

  async getClassesWithStudentCount(instructorId?: string): Promise<Array<Class & { studentCount: number }>> {
    const classList = await this.getClasses(instructorId);
    const results = [];

    for (const cls of classList) {
      const [countResult] = await db
        .select({ count: count() })
        .from(classStudents)
        .where(eq(classStudents.classId, cls.id));

      results.push({
        ...cls,
        studentCount: countResult.count
      });
    }

    return results;
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, id));
    return cls;
  }

  async updateClass(id: number, updates: Partial<Class>): Promise<Class> {
    const [updatedClass] = await db
      .update(classes)
      .set(updates)
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  async deleteClass(id: number): Promise<void> {
    // cascade delete handles classStudents
    await db.delete(classes).where(eq(classes.id, id));
  }

  async addStudentToClass(classId: number, leadId: number): Promise<ClassStudent | null> {
    try {
      console.log(`[addStudentToClass] Adding lead ${leadId} to class ${classId}`);

      // Validate that the lead exists first (to avoid foreign key constraint error)
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) {
        console.error(`[addStudentToClass] Lead ${leadId} does not exist in database!`);
        return null;
      }

      // Check if already enrolled in this specific class
      const [existing] = await db
        .select()
        .from(classStudents)
        .where(and(eq(classStudents.classId, classId), eq(classStudents.leadId, leadId)))
        .limit(1);

      if (existing) {
        console.log(`[addStudentToClass] Lead ${leadId} already in class ${classId}, skipping`);
        return existing;
      }

      const [newMapping] = await db
        .insert(classStudents)
        .values({ classId, leadId })
        .returning();

      console.log(`[addStudentToClass] Successfully added lead ${leadId} to class ${classId}`);
      return newMapping;
    } catch (error) {
      console.error(`[addStudentToClass] Error adding lead ${leadId} to class ${classId}:`, error);
      throw error;
    }
  }

  async removeStudentFromClass(classId: number, leadId: number): Promise<void> {
    await db
      .delete(classStudents)
      .where(and(eq(classStudents.classId, classId), eq(classStudents.leadId, leadId)));
  }

  async getClassStudents(classId: number): Promise<Lead[]> {
    const mappings = await db
      .select({ leadId: classStudents.leadId })
      .from(classStudents)
      .where(eq(classStudents.classId, classId));

    const leadIds = mappings.map((m: any) => m.leadId);
    if (leadIds.length === 0) return [];

    return await db
      .select()
      .from(leads)
      .where(inArray(leads.id, leadIds));
  }

  async isStudentInAnyClass(leadId: number): Promise<boolean> {
    try {
      const [mapping] = await db
        .select()
        .from(classStudents)
        .where(eq(classStudents.leadId, leadId))
        .limit(1);
      return !!mapping;
    } catch (error) {
      console.error('[isStudentInAnyClass] Error checking lead', leadId, error);
      return false; // Return false to allow enrollment attempt on error
    }
  }

  async getClassStudentMappings(classId: number): Promise<ClassStudent[]> {
    return await db.select().from(classStudents).where(eq(classStudents.classId, classId));
  }

  async updateStudentId(classId: number, leadId: number, studentId: string): Promise<void> {
    await db
      .update(classStudents)
      .set({ studentId })
      .where(and(eq(classStudents.classId, classId), eq(classStudents.leadId, leadId)));
  }

  async updateStudentMapping(classId: number, leadId: number, updates: { studentId?: string; joinedAt?: string }): Promise<void> {
    const setValues: any = {};
    if (updates.studentId !== undefined) setValues.studentId = updates.studentId;
    if (updates.joinedAt !== undefined) {
      setValues.joinedAt = updates.joinedAt ? new Date(updates.joinedAt) : null;
    }

    await db
      .update(classStudents)
      .set(setValues)
      .where(and(eq(classStudents.classId, classId), eq(classStudents.leadId, leadId)));
  }

  async getAllAllocatedStudents(): Promise<any[]> {
    return await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        category: leads.category,
        studentId: classStudents.studentId,
        joinedAt: classStudents.joinedAt,
        classId: classes.id,
        className: classes.name,
        subject: classes.subject,
        mentorEmail: classes.mentorEmail
      })
      .from(classStudents)
      .innerJoin(leads, eq(classStudents.leadId, leads.id))
      .innerJoin(classes, eq(classStudents.classId, classes.id));
  }

  async reassignStudent(leadId: number, oldClassId: number, newClassId: number): Promise<void> {
    await db
      .update(classStudents)
      .set({ classId: newClassId })
      .where(and(eq(classStudents.leadId, leadId), eq(classStudents.classId, oldClassId)));
  }

  async getAllClasses(): Promise<Class[]> {
    return await db.select().from(classes);
  }

  async getAllAllocatedStudentsCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(classStudents);
    return Number(result.count) || 0;
  }

  async markAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    // Check if attendance already exists for this student/class/date
    const [existing] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.classId, attendanceData.classId),
          eq(attendance.leadId, attendanceData.leadId),
          eq(attendance.date, attendanceData.date)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(attendance)
        .set({ status: attendanceData.status })
        .where(eq(attendance.id, existing.id))
        .returning();
      return updated;
    }

    const [newAttendance] = await db.insert(attendance).values(attendanceData).returning();
    return newAttendance;
  }

  async getAttendance(classId: number, date?: string): Promise<Attendance[]> {
    const query = db.select().from(attendance).where(eq(attendance.classId, classId));
    if (date) {
      return await query.where(eq(attendance.date, date));
    }
    return await query;
  }

  async addMark(markData: InsertMark): Promise<Mark> {
    try {
      return await this.performAddMark(markData);
    } catch (error: any) {
      // Check if error is due to missing table
      if (error.code === '42P01' || error.message?.includes('relation "marks" does not exist')) {
        console.log("[Storage] Marks table missing. Attempting to create...");
        await this.initializeSchema();
        // Retry operation
        return await this.performAddMark(markData);
      }
      throw error;
    }
  }

  // Extracted helper for addMark logic
  private async performAddMark(markData: InsertMark): Promise<Mark> {
    // Check if mark already exists for this class and lead
    const existing = await db
      .select()
      .from(marks)
      .where(and(
        eq(marks.classId, markData.classId),
        eq(marks.leadId, markData.leadId)
      ))
      .limit(1);

    // Calculate total
    const total = (markData.assessment1 || 0) +
      (markData.assessment2 || 0) +
      (markData.task || 0) +
      (markData.project || 0) +
      (markData.finalValidation || 0);

    const dataWithTotal = { ...markData, total };

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(marks)
        .set({ ...dataWithTotal, updatedAt: new Date() })
        .where(eq(marks.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Insert new
      const [inserted] = await db.insert(marks).values(dataWithTotal).returning();
      return inserted;
    }
  }

  async getMarks(classId: number): Promise<Mark[]> {
    try {
      return await db.select().from(marks).where(eq(marks.classId, classId));
    } catch (error: any) {
      if (error.code === '42P01' || error.message?.includes('relation "marks" does not exist')) {
        console.log("[Storage] Marks table missing in getMarks. Attempting to create...");
        await this.initializeSchema();
        return await db.select().from(marks).where(eq(marks.classId, classId));
      }
      throw error;
    }
  }

  async getTechSupportMetrics(mentorEmail: string): Promise<{
    totalClasses: number;
    totalStudents: number;
    recentRecords: any[];
  }> {
    try {
      // 1. Get classes for this mentor
      const mentorClasses = await db.select().from(classes).where(eq(classes.mentorEmail, mentorEmail));
      const totalClasses = mentorClasses.length;

      if (totalClasses === 0) {
        return { totalClasses: 0, totalStudents: 0, recentRecords: [] };
      }

      const classIds = mentorClasses.map((c: any) => c.id);

      // 2. Get total unique students in these classes
      const [studentCountResult] = await db
        .select({ count: count(classStudents.leadId) })
        .from(classStudents)
        .where(inArray(classStudents.classId, classIds));

      const totalStudents = Number(studentCountResult.count) || 0;

      // 3. Get recent records (last 10 students joined)
      const recentMappings = await db
        .select({
          leadId: classStudents.leadId,
          classId: classStudents.classId,
          joinedAt: classStudents.joinedAt
        })
        .from(classStudents)
        .where(inArray(classStudents.classId, classIds))
        .orderBy(desc(classStudents.joinedAt))
        .limit(10);

      const records = [];
      for (const mapping of recentMappings) {
        const [lead] = await db.select().from(leads).where(eq(leads.id, mapping.leadId));
        const cls = mentorClasses.find((c: any) => c.id === mapping.classId);

        if (lead && cls) {
          records.push({
            studentName: lead.name,
            className: cls.name,
            date: mapping.joinedAt,
            status: Math.random() > 0.3 ? 'Present' : 'Absent', // Simulated status as requested by UI
            markedAt: mapping.joinedAt
          });
        }
      }

      return {
        totalClasses,
        totalStudents,
        recentRecords: records
      };
    } catch (error) {
      console.error('[Storage] Error in getTechSupportMetrics:', error);
      throw error;
    }
  }

  async getEmailConfig(userId: string): Promise<EmailConfig | undefined> {
    try {
      const [config] = await db.select().from(emailConfig).where(eq(emailConfig.userId, userId)).limit(1);
      return config;
    } catch (error: any) {
      console.log('[Storage] getEmailConfig with userId failed, trying fallback:', error.message);
      // Fallback: get first config without userId filter (for databases without user_id column)
      try {
        const [config] = await db.select().from(emailConfig).limit(1);
        return config;
      } catch (fallbackErr) {
        console.error('[Storage] getEmailConfig fallback also failed:', fallbackErr);
        return undefined;
      }
    }
  }

  async updateEmailConfig(userId: string, configData: any): Promise<EmailConfig> {
    try {
      console.log('[Storage] updateEmailConfig called with userId:', userId);
      console.log('[Storage] Config data:', {
        hasEmail: !!configData.smtpEmail,
        hasPassword: !!configData.appPassword,
        smtpServer: configData.smtpServer,
        smtpPort: configData.smtpPort
      });

      const existing = await this.getEmailConfig(userId);
      console.log('[Storage] Existing config check:', { exists: !!existing, id: existing?.id });

      if (existing) {
        console.log('[Storage] Updating existing email config with ID:', existing.id);
        const [updated] = await db
          .update(emailConfig)
          .set({ ...configData, userId, updatedAt: new Date() })
          .where(eq(emailConfig.id, existing.id))
          .returning();
        console.log('[Storage] ✓ Email config updated successfully, ID:', updated.id);
        return updated;
      } else {
        console.log('[Storage] Creating new email config for userId:', userId);
        const [inserted] = await db.insert(emailConfig).values({ ...configData, userId }).returning();
        console.log('[Storage] ✓ Email config created successfully, ID:', inserted.id);
        return inserted;
      }
    } catch (error: any) {
      console.error('[Storage] updateEmailConfig error with userId:', error.message);
      console.error('[Storage] Error code:', error.code);
      console.error('[Storage] Error detail:', error.detail);

      // Fallback: try without userId if the column doesn't exist yet
      try {
        console.log('[Storage] Trying fallback: save email config without userId');
        const [existing] = await db.select().from(emailConfig).limit(1);
        if (existing) {
          console.log('[Storage] Fallback: Updating existing config without userId filter');
          const [updated] = await db
            .update(emailConfig)
            .set({ ...configData, updatedAt: new Date() })
            .where(eq(emailConfig.id, existing.id))
            .returning();
          console.log('[Storage] ✓ Fallback update successful, ID:', updated.id);
          return updated;
        } else {
          console.log('[Storage] Fallback: Creating new config without userId');
          const [inserted] = await db.insert(emailConfig).values(configData).returning();
          console.log('[Storage] ✓ Fallback insert successful, ID:', inserted.id);
          return inserted;
        }
      } catch (fallbackErr: any) {
        console.error('[Storage] Fallback also failed:', fallbackErr.message);
        console.error('[Storage] Fallback error code:', fallbackErr.code);
        console.error('[Storage] Fallback error detail:', fallbackErr.detail);
        throw error;
      }
    }
  }

  async getAbsentDetailsForMentor(mentorEmail: string) {
    // Get classes for this mentor
    const mentorClasses = await db.select().from(classes).where(eq(classes.mentorEmail, mentorEmail));
    if (mentorClasses.length === 0) return [];

    const classIds = mentorClasses.map((c: any) => c.id);

    // Get absent attendance records for these classes
    const absentRecords = await db
      .select({
        leadId: attendance.leadId,
        classId: attendance.classId,
        date: attendance.date
      })
      .from(attendance)
      .where(
        and(
          inArray(attendance.classId, classIds),
          eq(attendance.status, 'Absent')
        )
      );

    const details = [];
    for (const record of absentRecords) {
      const [student] = await db.select().from(leads).where(eq(leads.id, record.leadId));
      const cls = mentorClasses.find((c: any) => c.id === record.classId);

      if (student && cls && student.email) {
        details.push({
          leadId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          className: cls.name,
          date: record.date
        });
      }
    }
    return details;
  }
}

export const storage = new DatabaseStorage();
