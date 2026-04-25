export type ControlPlaneRuntimeTopVenture = {
  id: string;
  slug: string;
  name: string;
  currentStatus: string;
  weightedScore: number | null;
};

export type ControlPlaneRuntimeApproval = {
  id: string;
  subject: string;
  ownerName: string;
  status: string;
  thresholdRule: string;
  createdAt: string;
};

export type ControlPlaneRuntimeWeeklyMetrics = {
  weekLabel: string;
  completedExecutions: number;
  activeVentures: number;
  pendingApprovals: number;
  governanceOverrides: number;
};

export type ControlPlaneRuntimeSummary = {
  configured: boolean;
  source: "supabase" | "empty" | "unconfigured";
  topVenture: ControlPlaneRuntimeTopVenture | null;
  pendingApprovals: ControlPlaneRuntimeApproval[];
  weeklyMetrics: ControlPlaneRuntimeWeeklyMetrics | null;
};

type VentureRow = {
  id: string;
  slug: string;
  name: string;
  current_status: string;
  created_at: string;
};

type VentureScoreRow = {
  venture_id: string;
  weighted_score: number;
  effective_date: string;
};

type ApprovalRow = {
  id: string;
  subject: string;
  owner_name: string;
  status: string;
  threshold_rule: string;
  created_at: string;
};

type ExecutionRow = {
  id: string;
};

type OverrideRow = {
  id: string;
};

function readSupabaseRuntimeConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    restUrl: `${url.replace(/\/+$/, "")}/rest/v1`,
    serviceRoleKey,
  };
}

async function selectRows<T>(table: string, searchParams: URLSearchParams): Promise<T[]> {
  const config = readSupabaseRuntimeConfig();
  if (!config) {
    return [];
  }

  const endpoint = `${config.restUrl}/${table}?${searchParams.toString()}`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table} query failed: ${response.status}`);
  }

  const parsed = await response.json();
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function formatWeekLabel(weekStart: Date) {
  return `Week of ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(weekStart)}`;
}

function startOfUtcWeek(now = new Date()) {
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utc.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - diffToMonday);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

export async function loadControlPlaneRuntimeSummary(): Promise<ControlPlaneRuntimeSummary> {
  const config = readSupabaseRuntimeConfig();
  if (!config) {
    return {
      configured: false,
      source: "unconfigured",
      topVenture: null,
      pendingApprovals: [],
      weeklyMetrics: null,
    };
  }

  const weekStart = startOfUtcWeek();
  const weekStartIso = weekStart.toISOString();

  const venturesParams = new URLSearchParams({
    select: "id,slug,name,current_status,created_at",
    order: "created_at.desc",
  });
  const ventureScoresParams = new URLSearchParams({
    select: "venture_id,weighted_score,effective_date",
    order: "effective_date.desc",
  });
  const approvalsParams = new URLSearchParams({
    select: "id,subject,owner_name,status,threshold_rule,created_at",
    status: "eq.pending",
    order: "created_at.desc",
  });
  const completedExecutionsParams = new URLSearchParams({
    select: "id",
    status: "eq.completed",
    created_at: `gte.${weekStartIso}`,
  });
  const overridesParams = new URLSearchParams({
    select: "id",
    created_at: `gte.${weekStartIso}`,
  });

  const [
    ventures,
    ventureScores,
    pendingApprovalsRows,
    completedExecutions,
    weeklyOverrides,
  ] = await Promise.all([
    selectRows<VentureRow>("ventures", venturesParams),
    selectRows<VentureScoreRow>("venture_scores", ventureScoresParams),
    selectRows<ApprovalRow>("approvals", approvalsParams),
    selectRows<ExecutionRow>("executions", completedExecutionsParams),
    selectRows<OverrideRow>("overrides", overridesParams),
  ]);

  if (!ventures.length) {
    return {
      configured: true,
      source: "empty",
      topVenture: null,
      pendingApprovals: pendingApprovalsRows.map((row) => ({
        id: row.id,
        subject: row.subject,
        ownerName: row.owner_name,
        status: row.status,
        thresholdRule: row.threshold_rule,
        createdAt: row.created_at,
      })),
      weeklyMetrics: {
        weekLabel: formatWeekLabel(weekStart),
        completedExecutions: completedExecutions.length,
        activeVentures: 0,
        pendingApprovals: pendingApprovalsRows.length,
        governanceOverrides: weeklyOverrides.length,
      },
    };
  }

  const latestScoreByVenture = new Map<string, number>();
  for (const row of ventureScores) {
    if (!latestScoreByVenture.has(row.venture_id)) {
      latestScoreByVenture.set(row.venture_id, Number(row.weighted_score));
    }
  }

  const rankedVentures = [...ventures].sort((left, right) => {
    const rightScore = latestScoreByVenture.get(right.id) ?? Number.NEGATIVE_INFINITY;
    const leftScore = latestScoreByVenture.get(left.id) ?? Number.NEGATIVE_INFINITY;
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    return left.created_at.localeCompare(right.created_at);
  });

  const topVentureRow = rankedVentures[0] ?? null;

  return {
    configured: true,
    source: "supabase",
    topVenture: topVentureRow
      ? {
          id: topVentureRow.id,
          slug: topVentureRow.slug,
          name: topVentureRow.name,
          currentStatus: topVentureRow.current_status,
          weightedScore: latestScoreByVenture.get(topVentureRow.id) ?? null,
        }
      : null,
    pendingApprovals: pendingApprovalsRows.map((row) => ({
      id: row.id,
      subject: row.subject,
      ownerName: row.owner_name,
      status: row.status,
      thresholdRule: row.threshold_rule,
      createdAt: row.created_at,
    })),
    weeklyMetrics: {
      weekLabel: formatWeekLabel(weekStart),
      completedExecutions: completedExecutions.length,
      activeVentures: ventures.length,
      pendingApprovals: pendingApprovalsRows.length,
      governanceOverrides: weeklyOverrides.length,
    },
  };
}
