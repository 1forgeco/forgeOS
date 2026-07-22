import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const authCredentials = sqliteTable('auth_credentials', {
  userId: text('user_id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  passwordIterations: integer('password_iterations').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerUserId: text('owner_user_id').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const workspaceMembers = sqliteTable('workspace_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: text('workspace_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').notNull().default('owner'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex('workspace_members_workspace_user_unique').on(table.workspaceId, table.userId)])

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  templateId: text('template_id').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('draft'),
  websiteUrl: text('website_url').notNull(),
  goal: text('goal').notNull(),
  nodesJson: text('nodes_json').notNull(),
  edgesJson: text('edges_json').notNull(),
  lastRunAt: text('last_run_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const agentVersions = sqliteTable('agent_versions', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  version: integer('version').notNull(),
  definitionJson: text('definition_json').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const agentRuns = sqliteTable('agent_runs', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  status: text('status').notNull(),
  goal: text('goal').notNull(),
  result: text('result'),
  startedAt: text('started_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
})

export const approvalRequests = sqliteTable('approval_requests', {
  id: text('id').primaryKey(),
  runId: text('run_id'),
  agentId: text('agent_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  resolvedAt: text('resolved_at'),
})

export const workspaceConnections = sqliteTable('workspace_connections', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  provider: text('provider').notNull(),
  status: text('status').notNull().default('disconnected'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const agentMessages = sqliteTable('agent_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  role: text('role').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const bookingRequests = sqliteTable('booking_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reference: text('reference').notNull().unique(),
  sessionId: text('session_id').notNull(),
  serviceId: text('service_id').notNull(),
  serviceName: text('service_name').notNull(),
  preferredDate: text('preferred_date').notNull(),
  preferredTime: text('preferred_time').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  status: text('status').notNull().default('requested'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})
