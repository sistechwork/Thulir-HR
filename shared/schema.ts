import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  date,
  time,
  decimal
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().$type<'manager' | 'team_lead' | 'hr' | 'accounts' | 'admin' | 'tech-support' | 'session-coordinator'>(),
  fullName: text("full_name"),
  isActive: boolean("is_active").default(true),
  teamName: text("team_name"),
  teamLeadId: varchar("team_lead_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  degree: text("degree"),
  domain: text("domain"),
  sessionDays: text("session_days"),
  walkinDate: date("walkin_date"),
  walkinTime: time("walkin_time"),
  timing: text("timing"),
  currentOwnerId: varchar("current_owner_id").references(() => users.id),
  lastOwnerId: varchar("last_owner_id").references(() => users.id),
  sourceManagerId: varchar("source_manager_id").references(() => users.id),
  assignedTeamId: varchar("assigned_team_id").references(() => users.id),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  status: text("status").notNull().default('new'),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  // Dynamic columns for bulk import
  yearOfPassing: text("year_of_passing"),
  collegeName: text("college_name"),
  // HR workflow fields
  registrationAmount: decimal("registration_amount", { precision: 10, scale: 2 }),
  pendingAmount: decimal("pending_amount", { precision: 10, scale: 2 }),
  partialAmount: decimal("partial_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default('7000.00'),
  // Accounts workflow fields
  transactionNumber: text("transaction_number"),
  concession: decimal("concession", { precision: 10, scale: 2 }),
  category: text("category"),
  program: text("program"), // PET or COURSE
  claimedAt: timestamp("claimed_at"), // When HR claimed this lead (for 120-min auto-release)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tempLeads = pgTable("temp_leads", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  degree: text("degree"),
  domain: text("domain"),
  yearOfPassing: text("year_of_passing"),
  collegeName: text("college_name"),
  source: text("source").default('upload'), // 'bulk_import' or 'ocr'
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leadHistory = pgTable("lead_history", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  fromUserId: varchar("from_user_id").references(() => users.id),
  toUserId: varchar("to_user_id").references(() => users.id),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  changeReason: text("change_reason"),
  changeData: jsonb("change_data"),
  changedByUserId: varchar("changed_by_user_id").references(() => users.id).notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
});

export const uploads = pgTable("uploads", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  uploaderId: varchar("uploader_id").references(() => users.id).notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  rowCount: integer("row_count"),
  processedCount: integer("processed_count"),
  failedCount: integer("failed_count"),
  status: text("status").default('processing'),
  errors: jsonb("errors"),
});

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  imageUrl: text("image_url"),
  isRead: boolean("is_read").default(false),
  relatedLeadId: integer("related_lead_id").references(() => leads.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatTranscripts = pgTable("chat_transcripts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  hrUserId: varchar("hr_user_id").references(() => users.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productivityEvents = pgTable("productivity_events", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventType: text("event_type").notNull().$type<'mouseIdleWarning' | 'keyboardIdleWarning' | 'longKeyPressWarning' | 'tabSwitch'>(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Kathaipom Social Feed Tables
export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postDislikes = pgTable("post_dislikes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  commentText: text("comment_text").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Class Management Tables
export const classes = pgTable("classes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: text("name").notNull(),
  subject: text("subject"),
  mentorEmail: text("mentor_email"),
  mode: text("mode"),
  instructorId: varchar("instructor_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classStudents = pgTable("class_students", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  classId: integer("class_id").references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: 'cascade' }).notNull(),
  studentId: text("student_id"), // Generated ID like "Subject-01"
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  classId: integer("class_id").references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: 'cascade' }).notNull(),
  date: date("date").notNull(),
  status: text("status").notNull(), // 'Present', 'Absent'
  createdAt: timestamp("created_at").defaultNow(),
});

export const marks = pgTable("marks", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  classId: integer("class_id").references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: 'cascade' }).notNull(),
  assessment1: integer("assessment1").default(0), // 0-10
  assessment2: integer("assessment2").default(0), // 0-10
  task: integer("task").default(0), // 0-10
  project: integer("project").default(0), // 0-10
  finalValidation: integer("final_validation").default(0), // 0-10
  total: integer("total").default(0), // Auto-calculated: sum of all (0-50)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Configuration Table
export const emailConfig = pgTable("email_config", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").references(() => users.id).unique(), // Optional - for per-user config
  smtpEmail: text("smtp_email").notNull(),
  appPassword: text("app_password").notNull(),
  smtpServer: text("smtp_server").notNull(),
  smtpPort: integer("smtp_port").notNull().default(587),
  isEnabled: boolean("is_enabled").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  ownedLeads: many(leads, { relationName: "currentOwner" }),
  managedLeads: many(leads, { relationName: "sourceManager" }),
  uploads: many(uploads),
  notifications: many(notifications),
  historyEntries: many(leadHistory),
  chatTranscripts: many(chatTranscripts),
  productivityEvents: many(productivityEvents),
}));

export const productivityEventRelations = relations(productivityEvents, ({ one }) => ({
  user: one(users, {
    fields: [productivityEvents.userId],
    references: [users.id],
  }),
}));

export const chatTranscriptRelations = relations(chatTranscripts, ({ one }) => ({
  hrUser: one(users, {
    fields: [chatTranscripts.hrUserId],
    references: [users.id],
  }),
}));

export const leadRelations = relations(leads, ({ one, many }) => ({
  currentOwner: one(users, {
    fields: [leads.currentOwnerId],
    references: [users.id],
    relationName: "currentOwner",
  }),
  sourceManager: one(users, {
    fields: [leads.sourceManagerId],
    references: [users.id],
    relationName: "sourceManager",
  }),
  history: many(leadHistory),
}));

export const classRelations = relations(classes, ({ one, many }) => ({
  instructor: one(users, {
    fields: [classes.instructorId],
    references: [users.id],
  }),
  students: many(classStudents),
  attendance: many(attendance),
  marks: many(marks),
}));

export const classStudentRelations = relations(classStudents, ({ one }) => ({
  class: one(classes, {
    fields: [classStudents.classId],
    references: [classes.id],
  }),
  lead: one(leads, {
    fields: [classStudents.leadId],
    references: [leads.id],
  }),
}));

export const leadHistoryRelations = relations(leadHistory, ({ one }) => ({
  lead: one(leads, {
    fields: [leadHistory.leadId],
    references: [leads.id],
  }),
  fromUser: one(users, {
    fields: [leadHistory.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [leadHistory.toUserId],
    references: [users.id],
  }),
  changedBy: one(users, {
    fields: [leadHistory.changedByUserId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});

export const insertClassStudentSchema = createInsertSchema(classStudents).omit({
  id: true,
  joinedAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const insertMarksSchema = createInsertSchema(marks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["new", "register", "scheduled", "completed", "pending", "ready_for_class", "call_back", "dropped", "not_interested", "not_picking", "wrong_number"]).optional(),
  sessionDays: z.enum(["M,W,F", "T,T,S", "daily", "weekend", "custom"]).nullable().optional(),
  yearOfPassing: z.string().nullable().optional(),
  collegeName: z.string().nullable().optional(),
  registrationAmount: z.string().nullable().optional(), // Will be parsed as decimal in backend
  pendingAmount: z.string().nullable().optional(), // Will be parsed as decimal in backend
  partialAmount: z.string().nullable().optional(), // Will be parsed as decimal in backend
  totalAmount: z.string().nullable().optional(), // Will be parsed as decimal in backend
  program: z.string().nullable().optional(),
});

export const insertLeadHistorySchema = createInsertSchema(leadHistory).omit({
  id: true,
  changedAt: true,
});

export const insertUploadSchema = createInsertSchema(uploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertChatTranscriptSchema = createInsertSchema(chatTranscripts).omit({
  id: true,
  createdAt: true,
});

export const insertProductivityEventSchema = createInsertSchema(productivityEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  eventType: z.enum(['mouseIdleWarning', 'keyboardIdleWarning', 'longKeyPressWarning', 'tabSwitch']),
  metadata: z.object({
    url: z.string().optional(),
    key: z.string().optional(),
    duration: z.number().optional(),
  }).optional(),
});

export const insertEmailConfigSchema = createInsertSchema(emailConfig).omit({
  id: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ClassStudent = typeof classStudents.$inferSelect;
export type InsertClassStudent = z.infer<typeof insertClassStudentSchema>;
export type LeadHistory = typeof leadHistory.$inferSelect;
export type InsertLeadHistory = z.infer<typeof insertLeadHistorySchema>;
export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ChatTranscript = typeof chatTranscripts.$inferSelect;
export type InsertChatTranscript = z.infer<typeof insertChatTranscriptSchema>;
export type ProductivityEvent = typeof productivityEvents.$inferSelect;
export type InsertProductivityEvent = z.infer<typeof insertProductivityEventSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Mark = typeof marks.$inferSelect;
export type InsertMark = z.infer<typeof insertMarksSchema>;
export type EmailConfig = typeof emailConfig.$inferSelect;
export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;

export const insertTempLeadSchema = createInsertSchema(tempLeads);
export type TempLead = typeof tempLeads.$inferSelect;
export type InsertTempLead = z.infer<typeof insertTempLeadSchema>;
