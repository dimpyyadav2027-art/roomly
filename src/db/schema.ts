import { pgTable, uuid, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const makeovers = pgTable("makeovers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  roomType: text("room_type").notNull(),
  theme: text("theme").notNull(),
  budget: integer("budget").notNull(),
  tier: text("tier", { enum: ["FREE", "PAID_150"] }).notNull().default("FREE"),
  status: text("status", { enum: ["queued", "processing", "succeeded", "failed", "demo"] })
    .notNull()
    .default("queued"),
  prompt: text("prompt").notNull(),
  inputImageUrl: text("input_image_url"),
  outputImageUrl: text("output_image_url"),
  predictionId: text("prediction_id"),
  error: text("error"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Makeover = typeof makeovers.$inferSelect;
export type NewMakeover = typeof makeovers.$inferInsert;
