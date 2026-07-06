import { pgTable, text, timestamp, uuid, primaryKey, doublePrecision } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  status: text("status").default("offline"),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(), // 'private' or 'group'
  name: text("name"), // For group chats
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMembers = pgTable("chat_members", {
  chatId: uuid("chat_id").notNull().references(() => chats.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chatId, t.userId] }),
}));

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: uuid("chat_id").notNull().references(() => chats.id),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  type: text("type").notNull().default("text"), // 'text', 'image', 'video', 'voice', 'file'
  content: text("content"), 
  fileName: text("file_name"),
  fileSize: text("file_size"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageReads = pgTable("message_reads", {
  messageId: uuid("message_id").notNull().references(() => messages.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.messageId, t.userId] }),
}));

export const cases = pgTable("cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("open").notNull(), // 'open', 'pending', 'closed'
  priority: text("priority").default("medium").notNull(), // 'low', 'medium', 'high', 'critical'
  officerId: uuid("officer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const caseEvidence = pgTable("case_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), 
  url: text("url").notNull(),
  hash: text("hash"),
  metadata: text("metadata"), // Stored as JSON string
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const chainOfCustody = pgTable("chain_of_custody", {
  id: uuid("id").defaultRandom().primaryKey(),
  evidenceId: uuid("evidence_id").notNull().references(() => caseEvidence.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  performedBy: uuid("performed_by").references(() => users.id),
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const caseTimeline = pgTable("case_timeline", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // 'created', 'status_change', 'evidence_added', 'note'
  description: text("description").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiSettings = pgTable("ai_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id).unique(),
  provider: text("provider").default('ollama').notNull(),
  endpoint: text("endpoint").default('http://localhost:11434/v1'),
  apiKey: text("api_key"),
  model: text("model").default('llama3'),
  embeddingModel: text("embedding_model").default('nomic-embed-text'),
});

export const ragDocuments = pgTable("rag_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  // We'll store embeddings as JSON array of numbers for simplicity without pgvector
  embedding: text("embedding"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ocrResults = pgTable("ocr_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  engine: text("engine").notNull(),
  textContent: text("text_content").notNull(),
  jsonData: text("json_data"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gisMarkers = pgTable("gis_markers", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gisTracks = pgTable("gis_tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  pathData: text("path_data").notNull(), // JSON array of [lat, lng]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gisGeofences = pgTable("gis_geofences", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  fenceType: text("fence_type").notNull(), // 'circle' or 'polygon'
  geomData: text("geom_data").notNull(), // JSON of coordinates / radius
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const faceProfiles = pgTable("face_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectName: text("subject_name").notNull(),
  imageUrl: text("image_url").notNull(),
  embedding: text("embedding").notNull(), // JSON array
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

