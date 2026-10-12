import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiFetch, type AppUser, type SessionStatus } from '@/lib/api';

export type DashboardMessage = {
  id: string;
  to: string;
  direction: 'inbound' | 'outbound';
  type: string;
  status: string;
  bodyPreview: string | null;
  errorReason: string | null;
  createdAt: string;
  deliveredAt: string | null;
};
export type ActivityPoint = {
  date: string;
  total: number;
  delivered: number;
  failed: number;
};
export type WorkspaceOverview = {
  tenant: {
    id: string;
    companyName: string;
    slug: string;
    status: string;
    plan: string;
    dailyMessageLimit: number;
  } | null;
  session:
    | (SessionStatus & {
        disconnectedAt?: string | null;
        reconnectCount?: number;
        lastHeartbeat?: string | null;
        isSocketAlive?: boolean;
      })
    | null;
  metrics: {
    totalMessages: number;
    outboundMessages: number;
    inboundMessages: number;
    queuedMessages: number;
    processingMessages: number;
    sentMessages: number;
    deliveredMessages: number;
    failedMessages: number;
    deliveryRate: number;
  };
  activity: ActivityPoint[];
  recentMessages: DashboardMessage[];
  templatesCount: number;
  teamMembers: number;
  webhook: {
    configured: boolean;
    url?: string;
    isActive?: boolean;
    failureCount?: number;
    lastSuccessAt?: string | null;
    lastFailureAt?: string | null;
  };
};
export type WorkspaceAnalytics = {
  periodDays: number;
  metrics: {
    totalMessages: number;
    outboundMessages: number;
    inboundMessages: number;
    uniqueContacts: number;
    deliveredMessages: number;
    failedMessages: number;
    deliveryRate: number;
    replyRate: number;
    averageDeliverySeconds: number;
  };
  activity: ActivityPoint[];
  statusBreakdown: { status: string; count: number }[];
};
export type BroadcastBatch = {
  batchId: string;
  createdAt: string;
  recipients: number;
  delivered: number;
  failed: number;
  pending: number;
  bodyPreview: string | null;
  deliveryRate: number;
  status: string;
};
export type InboxMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  type: string;
  body: string | null;
  media: {
    url: string | null;
    endpoint: string | null;
    available: boolean;
    fileName: string | null;
    mimeType: string | null;
    durationSeconds: number | null;
    ptt: boolean;
    gifPlayback: boolean;
  } | null;
  status: string;
  createdAt: string;
};
export type InboxConversation = {
  phone: string;
  lastAt: string;
  lastMessage: string | null;
  inboundCount: number;
  messages: InboxMessage[];
};
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
export type MessageTemplate = {
  id: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
  language: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type WorkspaceSettings = {
  workspace: {
    id: string;
    companyName: string;
    slug: string;
    plan: string;
    status: string;
    rateLimitPerMinute: number;
    dailyMessageLimit: number;
    description: string;
    timezone: string;
  };
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    phoneNumber: string | null;
  };
};
export type DeveloperSettings = {
  credential: {
    clientId: string;
    secretPrefix: string;
    isActive: boolean;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
  } | null;
  webhook: {
    url: string;
    events: string[];
    isActive: boolean;
    failureCount: number;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
  } | null;
};
export type WorkspaceBilling = {
  plan: {
    id: string;
    name: string;
    status: string;
    accountStatus: string;
    subscriptionStartedAt: string;
    subscriptionEndsAt: string | null;
    subscriptionAutoRenew: boolean;
    subscriptionSuspensionReason: string | null;
    monthlyPriceCents: number;
    currency: string;
    rateLimitPerMinute: number;
    dailyMessageLimit: number;
    monthlyMessageAllowance: number;
  };
  billing: {
    provider: string;
    pricingConfigured: boolean;
    periodStart: string;
    periodEnd: string;
    nextBillingAt: string;
    basePlanCents: number;
    estimatedApiCostCents: number;
    estimatedTotalCents: number;
    apiCostPerThousandCents: number;
  };
  usage: {
    totalMessages: number;
    outboundMessages: number;
    inboundMessages: number;
    deliveredMessages: number;
    failedMessages: number;
    uniqueContacts: number;
    todayOutbound: number;
    todayRemaining: number;
    dailyUsagePercent: number;
    monthlyUsagePercent: number;
    projectedOutbound: number;
    deliveryRate: number;
  };
  invoices: {
    id: string;
    number: string;
    status: string;
    amountCents: number;
    currency: string;
    issuedAt: string;
    downloadUrl?: string;
  }[];
};
export type WorkspaceReport = {
  days: 7 | 30 | 90;
  generatedAt: string;
  period: { start: string; end: string };
  summary: {
    totalMessages: number;
    outboundMessages: number;
    inboundMessages: number;
    uniqueContacts: number;
    deliveredMessages: number;
    failedMessages: number;
    deliveryRate: number;
    replyRate: number;
    averageDeliverySeconds: number;
  };
  activity: ActivityPoint[];
  statusBreakdown: { status: string; count: number }[];
  typeBreakdown: { type: string; count: number }[];
};

export type AdminOverview = {
  totalTenants: number;
  totalMessages: number;
  activeSessions: number;
  inMemorySockets: number;
  totalUsers: number;
  activeUsers: number;
  platformAdmins: number;
  tenantAdmins: number;
  tenantAgents: number;
  totalVisitors: number;
  visitorsToday: number;
  timestamp: string;
};
export type AdminTenant = {
  id: string;
  companyName: string;
  slug: string;
  status: string;
  plan: string;
  subscriptionPlanId: string | null;
  planName: string;
  planSlug: string;
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  subscriptionAutoRenew: boolean;
  dailyMessageLimit: number;
  rateLimitPerMinute: number;
  createdAt: string;
  userCount: number;
  messageCount: number;
  whatsappSession?: {
    status: string;
    phoneNumber: string | null;
    connectedAt: string | null;
  } | null;
};
export type AdminSubscription = {
  id: string;
  companyName: string;
  slug: string;
  accountStatus: 'active' | 'suspended' | 'deleted';
  plan: string;
  subscriptionPlanId: string | null;
  planName: string;
  planSlug: string;
  subscriptionStatus: SubscriptionStatus;
  effectiveSubscriptionStatus: SubscriptionStatus;
  subscriptionStartedAt: string;
  subscriptionEndsAt: string | null;
  subscriptionAutoRenew: boolean;
  subscriptionSuspendedAt: string | null;
  subscriptionSuspensionReason: string | null;
  subscriptionLastRenewedAt: string | null;
  daysRemaining: number | null;
  dailyMessageLimit: number;
  rateLimitPerMinute: number;
  todayUsage: number;
  todayRemaining: number;
  dailyUsagePercent: number;
  currentPeriodMessages: number;
  monthlyPriceCents: number;
  currency: string;
  activeUsers: number;
  whatsappStatus: string;
};
export type AdminPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPriceCents: number;
  trialDays: number;
  currency: string;
  dailyMessageLimit: number;
  rateLimitPerMinute: number;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  organizationCount: number;
  createdAt: string;
  updatedAt: string;
};
export type SubscriptionStatus =
  'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
export type AdminSubscriptionsResponse = {
  stats: {
    total: number;
    active: number;
    trialing: number;
    attention: number;
    expiringSoon: number;
    monthlyRecurringRevenueCents: number;
  };
  subscriptions: AdminSubscription[];
  currency: string;
  pricingConfigured: boolean;
};
export type AdminUser = {
  id: string;
  tenantId: string;
  organization: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: 'super_admin' | 'tenant_admin' | 'tenant_agent';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
export type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
};
export type AdminVisitor = {
  id: string;
  visitorId: string;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  landingPath: string;
  lastVisitedPath: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  pageViews: number;
  firstSeenAt: string;
  lastSeenAt: string;
};
export type AdminVisitorsResponse = {
  visitors: AdminVisitor[];
  total: number;
  page: number;
  limit: number;
  stats: {
    uniqueVisitors: number;
    pageViews: number;
    visitorsToday: number;
    activeNow: number;
  };
  activity: { date: string; visitors: number }[];
};
export type AuditLog = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  userId: string | null;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
};
export type AuditResponse = {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
};
export type AdminMessage = {
  id: string;
  tenantId: string;
  organization: string;
  to: string;
  from: string | null;
  direction: string;
  type: string;
  status: string;
  bodyPreview: string | null;
  errorReason: string | null;
  createdAt: string;
};
export type AdminMessagesResponse = {
  messages: AdminMessage[];
  total: number;
  page: number;
  limit: number;
  today: { total: number; delivered: number; failed: number };
};
export type AdminHealth = {
  status: string;
  timestamp: string;
  services: {
    api: { status: string };
    database: { status: string; latencyMs: number };
    queue: {
      status: string;
      queuedMessages: number;
      processingMessages: number;
    };
    whatsapp: {
      status: string;
      activeSessions: number;
      inMemorySockets: number;
    };
  };
  failedMessages: number;
};
export type AdminSettings = {
  environment: string;
  apiPrefix: string;
  queueSchema: string;
  queueMonitorIntervalSeconds: number;
  otpExpirySeconds: number;
  corsOrigins: string[];
};

function useClientAuth() {
  const [ready, setReady] = useState(false);
  useEffect(
    () => setReady(Boolean(window.localStorage.getItem('wa_access_token'))),
    [],
  );
  return ready;
}

export const queryKeys = {
  workspaceOverview: ['dashboard', 'overview'] as const,
  workspaceAnalytics: ['dashboard', 'analytics'] as const,
  broadcasts: ['dashboard', 'broadcasts'] as const,
  inbox: ['dashboard', 'inbox'] as const,
  team: ['dashboard', 'team'] as const,
  templates: ['templates'] as const,
  workspaceSettings: ['dashboard', 'settings'] as const,
  developer: ['dashboard', 'developer'] as const,
  workspaceBilling: ['dashboard', 'billing'] as const,
  sessionStatus: ['sessions', 'status'] as const,
  adminOverview: ['admin', 'overview'] as const,
  adminTenants: ['admin', 'tenants'] as const,
  adminSubscriptions: ['admin', 'subscriptions'] as const,
  adminPlans: ['admin', 'plans'] as const,
  adminUsers: ['admin', 'users', 1, 200] as const,
  adminVisitors: ['admin', 'visitors', 1, 200] as const,
  adminMessages: ['admin', 'messages', 1, 50] as const,
  adminHealth: ['admin', 'health'] as const,
  adminAudit: ['admin', 'audit', 1, 100] as const,
  adminSettings: ['admin', 'settings'] as const,
};

function useAuthedQuery<T>(
  queryKey: readonly unknown[],
  path: string,
  refetchInterval?: number,
  active = true,
) {
  const authenticated = useClientAuth();
  return useQuery({
    queryKey,
    queryFn: () => apiFetch<T>(path),
    enabled: active && authenticated,
    refetchInterval,
  });
}

export function useWorkspaceOverview(active = true) {
  return useAuthedQuery<WorkspaceOverview>(
    queryKeys.workspaceOverview,
    '/dashboard/overview',
    30_000,
    active,
  );
}
export function useWorkspaceAnalytics(active = true) {
  return useAuthedQuery<WorkspaceAnalytics>(
    queryKeys.workspaceAnalytics,
    '/dashboard/analytics',
    30_000,
    active,
  );
}
export function useBroadcasts(active = true) {
  return useAuthedQuery<BroadcastBatch[]>(
    queryKeys.broadcasts,
    '/dashboard/broadcasts',
    30_000,
    active,
  );
}
export function useInbox(active = true) {
  const authenticated = useClientAuth();
  return useQuery({
    queryKey: queryKeys.inbox,
    queryFn: () => apiFetch<InboxConversation[]>('/dashboard/inbox'),
    enabled: active && authenticated,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  });
}
export function useTeam(active = true) {
  return useAuthedQuery<TeamMember[]>(
    queryKeys.team,
    '/dashboard/team',
    60_000,
    active,
  );
}
export function useTemplates(active = true) {
  return useAuthedQuery<MessageTemplate[]>(
    queryKeys.templates,
    '/templates',
    60_000,
    active,
  );
}
export function useWorkspaceSettings(active = true) {
  return useAuthedQuery<WorkspaceSettings>(
    queryKeys.workspaceSettings,
    '/dashboard/settings',
    undefined,
    active,
  );
}
export function useDeveloperSettings(active = true) {
  return useAuthedQuery<DeveloperSettings>(
    queryKeys.developer,
    '/dashboard/developer',
    60_000,
    active,
  );
}
export function useWorkspaceBilling(active = true) {
  return useAuthedQuery<WorkspaceBilling>(
    queryKeys.workspaceBilling,
    '/dashboard/billing',
    30_000,
    active,
  );
}
export function useWorkspaceReport(days: 7 | 30 | 90, active = true) {
  return useAuthedQuery<WorkspaceReport>(
    ['dashboard', 'reports', days],
    `/dashboard/reports?days=${days}`,
    30_000,
    active,
  );
}
export function useSessionStatus(active = true) {
  return useAuthedQuery<SessionStatus>(
    queryKeys.sessionStatus,
    '/sessions/status',
    20_000,
    active,
  );
}
export function useAdminOverview(active = true) {
  return useAuthedQuery<AdminOverview>(
    queryKeys.adminOverview,
    '/admin/stats/overview',
    30_000,
    active,
  );
}
export function useAdminTenants(active = true) {
  return useAuthedQuery<AdminTenant[]>(
    queryKeys.adminTenants,
    '/admin/tenants',
    30_000,
    active,
  );
}
export function useAdminSubscriptions(active = true) {
  return useAuthedQuery<AdminSubscriptionsResponse>(
    queryKeys.adminSubscriptions,
    '/admin/subscriptions',
    30_000,
    active,
  );
}
export function useAdminPlans(active = true) {
  return useAuthedQuery<AdminPlan[]>(
    queryKeys.adminPlans,
    '/admin/plans',
    60_000,
    active,
  );
}
export function useAdminUsers(active = true) {
  return useAuthedQuery<AdminUsersResponse>(
    queryKeys.adminUsers,
    '/admin/users?page=1&limit=200',
    30_000,
    active,
  );
}
export function useAdminVisitors(active = true) {
  return useAuthedQuery<AdminVisitorsResponse>(
    queryKeys.adminVisitors,
    '/admin/visitors?page=1&limit=200',
    30_000,
    active,
  );
}
export function useAdminMessages(active = true) {
  return useAuthedQuery<AdminMessagesResponse>(
    queryKeys.adminMessages,
    '/admin/messages?page=1&limit=50',
    20_000,
    active,
  );
}
export function useAdminHealth(active = true) {
  return useAuthedQuery<AdminHealth>(
    queryKeys.adminHealth,
    '/admin/health',
    15_000,
    active,
  );
}
export function useAdminAudit(active = true) {
  return useAuthedQuery<AuditResponse>(
    queryKeys.adminAudit,
    '/admin/audit-logs?page=1&limit=100',
    30_000,
    active,
  );
}
export function useAdminSettings(active = true) {
  return useAuthedQuery<AdminSettings>(
    queryKeys.adminSettings,
    '/admin/settings',
    60_000,
    active,
  );
}

export function getStoredUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(
      window.localStorage.getItem('wa_user') || 'null',
    ) as AppUser | null;
  } catch {
    return null;
  }
}
