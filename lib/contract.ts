/** Shared contract: types + endpoint constants used by API routes AND the UI. */

import type { AnalyzeResponse } from "./astro/types";

export type Role = "admin" | "user";
export type Plan = "free" | "paid";
export type CustomerStatus = "READY" | "BLOCKED";
export type UpgradeStatus = "pending" | "approved" | "declined";
export type PredictionSource = "app" | "legacy_pdf";
export type PredictionOutcome = "pending" | "hit" | "miss" | "partial" | "unknown";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  plan: Plan;
  preferredLanguage: string;
  createdAt: string;
}

export interface AdminUserRow extends PublicUser {
  customerCount: number;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone: string;
  birthUtc: string;
  status: CustomerStatus;
  limitations: string[];
  calculatedAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  questionCategory: string | null;
  domains: string[];
  convergenceLabel: string | null;
  supportingFindingIds: string[];
  uncertaintyNotes: string[];
  knowledgeStatusSummary: Record<string, number>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  title: string;
  createdAt: string;
}

export interface Prediction {
  id: string;
  customerId: string;
  statement: string;
  category: string;
  windowStart: string | null;
  windowEnd: string | null;
  convergenceLabel: string | null;
  source: PredictionSource;
  outcome: PredictionOutcome;
  outcomeNotes: string | null;
  createdAt: string;
}

export interface CalibrationEvent {
  id: string;
  customerId: string;
  eventDate: string;
  datePrecision: "day" | "month" | "year";
  category: string;
  description: string;
  confirmed: boolean;
  createdAt: string;
}

export interface UpgradeRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  message: string;
  status: UpgradeStatus;
  createdAt: string;
}

/* --------------------------------------------------------------- requests */

export interface CreateCustomerRequest {
  name: string;
  birthDate: string;
  birthTime: string;
  placeText: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface AskRequest {
  customerId: string;
  question: string;
  asOf?: string;
  statedFact?: { text: string; category?: string; eventDate?: string };
}

export interface AskResponse {
  messageId: string;
  answerText: string;
  answerSource: "llm" | "fallback";
  questionCategory: string;
  domains: string[];
  convergenceLabel: string;
  supportingFindingIds: string[];
  uncertaintyNotes: string[];
  knowledgeStatusSummary: Record<string, number>;
  engineRunId: string;
  analysis: AnalyzeResponse;
}

export interface PlaceCandidateDto {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface ApiError {
  code: string;
  message: string;
  detail?: unknown;
}

/* -------------------------------------------------------------- endpoints */

export const API = {
  auth: "/api/auth",
  signup: "/api/auth/signup",
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  customers: "/api/customers",
  chart: (id: string) => `/api/chart/${id}`,
  dasha: (id: string) => `/api/dasha/${id}`,
  ask: "/api/ask",
  conversations: (customerId: string) => `/api/conversations?customerId=${customerId}`,
  messages: (conversationId: string) => `/api/messages?conversationId=${conversationId}`,
  predictions: (customerId?: string) => (customerId ? `/api/predictions?customerId=${customerId}` : "/api/predictions"),
  prediction: (id: string) => `/api/predictions/${id}`,
  calibrationEvents: "/api/calibration-events",
  upgradeRequests: "/api/upgrade-requests",
  adminUsers: "/api/admin/users",
  adminUser: (id: string) => `/api/admin/users/${id}`,
  adminUpgradeRequests: "/api/admin/upgrade-requests",
  adminUpgradeRequest: (id: string) => `/api/admin/upgrade-requests/${id}`,
  adminStats: "/api/admin/stats",
} as const;
