import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, decimal } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User recipe preferences: favorites, ratings, notes
 */
export const userRecipeData = mysqlTable("userRecipeData", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  recipeId: varchar("recipeId", { length: 255 }).notNull(),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  rating: int("rating").default(0).notNull(), // 0-5 stars
  notes: text("notes"),
  madeCount: int("madeCount").default(0).notNull(),
  lastMade: timestamp("lastMade"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserRecipeData = typeof userRecipeData.$inferSelect;
export type InsertUserRecipeData = typeof userRecipeData.$inferInsert;

/**
 * Weekly meal plan entries
 */
export const mealPlan = mysqlTable("mealPlan", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekStart: timestamp("weekStart").notNull(), // Monday of the week
  day: varchar("day", { length: 10 }).notNull(), // Monday, Tuesday, etc.
  slot: mysqlEnum("slot", ["lunch", "dinner"]).notNull(),
  recipeId: varchar("recipeId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MealPlan = typeof mealPlan.$inferSelect;
export type InsertMealPlan = typeof mealPlan.$inferInsert;

/**
 * Shopping list items for the week
 */
export const shoppingList = mysqlTable("shoppingList", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekStart: timestamp("weekStart").notNull(),
  item: varchar("item", { length: 255 }).notNull(),
  amount: varchar("amount", { length: 50 }),
  unit: varchar("unit", { length: 50 }),
  category: varchar("category", { length: 50 }),
  checked: boolean("checked").default(false).notNull(),
  recipeIds: json("recipeIds").$type<string[]>().notNull(), // JSON array of recipe IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShoppingList = typeof shoppingList.$inferSelect;
export type InsertShoppingList = typeof shoppingList.$inferInsert;
