import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const partners = sqliteTable("partners", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  data: text("data").notNull(),
  createdAt: text("created_at").notNull(),
  profileDigest: text("profile_digest"),
  profileExpires: integer("profile_expires"),
});
export const signupStarts = sqliteTable("signup_starts", {
  id: text("id").primaryKey(), source: text("source").notNull(), createdAt: text("created_at").notNull(),
});
export const sessions = sqliteTable("sessions", {
  digest: text("digest").primaryKey(), githubId: text("github_id").notNull(),
  login: text("login").notNull(), expires: integer("expires").notNull(),
});
export const oauthStates = sqliteTable("oauth_states", {
  digest: text("digest").primaryKey(), deviceCode: text("device_code").notNull(),
  expires: integer("expires").notNull(), interval: integer("interval").notNull(),
  nextPoll: integer("next_poll").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  id: text("id").primaryKey(), count: integer("count").notNull(), expires: integer("expires").notNull(),
});
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(), actor: text("actor").notNull(),
  partnerId: text("partner_id").notNull(), action: text("action").notNull(), createdAt: text("created_at").notNull(),
});
