/**
 * Canonical alert thresholds for Datadog, Grafana/Prometheus, and PagerDuty (#235).
 *
 * Dashboards and alert config files must stay in sync with this module.
 * Runtime evaluation is used by tests and can be wired to a metrics snapshot.
 */

export type AlertSeverity = "critical" | "warning";
export type AlertComparator = "gt" | "lt";

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  description: string;
  threshold: number;
  comparator: AlertComparator;
  /** Prometheus-style window, e.g. 5m */
  window: string;
  severity: AlertSeverity;
  /** Page PagerDuty when this rule fires. Critical rules must be true. */
  pagerduty: boolean;
  runbook: string;
}

export const PAGERDUTY_RUNBOOK =
  "https://github.com/PromptMintLabs/prompt-mint/blob/main/docs/operations/monitoring.md";

export const ALERT_RULES: AlertRule[] = [
  {
    id: "rpc_latency_p99",
    name: "RPC call latency P99",
    metric: "rpc_call_duration_ms",
    description: "Soroban RPC P99 latency exceeded 2s for 5 minutes.",
    threshold: 2000,
    comparator: "gt",
    window: "5m",
    severity: "critical",
    pagerduty: true,
    runbook: PAGERDUTY_RUNBOOK,
  },
  {
    id: "api_error_rate",
    name: "API error rate",
    metric: "api_request_error_total",
    description: "Sustained API 5xx rate above 5 errors/sec.",
    threshold: 5,
    comparator: "gt",
    window: "5m",
    severity: "critical",
    pagerduty: true,
    runbook: PAGERDUTY_RUNBOOK,
  },
  {
    id: "endpoint_health",
    name: "API endpoint health",
    metric: "api_endpoint_health",
    description: "A scraped API endpoint is unhealthy (gauge 0) for 2 minutes.",
    threshold: 1,
    comparator: "lt",
    window: "2m",
    severity: "critical",
    pagerduty: true,
    runbook: PAGERDUTY_RUNBOOK,
  },
  {
    id: "unlock_error_rate",
    name: "Unlock failure rate",
    metric: "unlock_failure_total",
    description: "Elevated unlock failures (>10/sec) may indicate RPC or key issues.",
    threshold: 10,
    comparator: "gt",
    window: "5m",
    severity: "warning",
    pagerduty: false,
    runbook: PAGERDUTY_RUNBOOK,
  },
  {
    id: "tx_volume_drop",
    name: "Transaction volume drop",
    metric: "transaction_volume_total",
    description: "On-chain submit volume dropped below 1 tx / 15m during expected traffic.",
    threshold: 1,
    comparator: "lt",
    window: "15m",
    severity: "warning",
    pagerduty: false,
    runbook: PAGERDUTY_RUNBOOK,
  },
  {
    id: "active_users_drop",
    name: "Active users drop",
    metric: "active_users_total",
    description: "Active-user heartbeat dropped to zero for 15 minutes.",
    threshold: 1,
    comparator: "lt",
    window: "15m",
    severity: "warning",
    pagerduty: false,
    runbook: PAGERDUTY_RUNBOOK,
  },
];

export interface MetricSample {
  name: string;
  value: number;
  labels?: Record<string, string | number>;
}

export interface FiringAlert {
  rule: AlertRule;
  value: number;
  pagePagerDuty: boolean;
}

export function compareThreshold(value: number, comparator: AlertComparator, threshold: number): boolean {
  return comparator === "gt" ? value > threshold : value < threshold;
}

export function evaluateAlerts(samples: MetricSample[], rules: AlertRule[] = ALERT_RULES): FiringAlert[] {
  const latestByMetric = new Map<string, number>();
  for (const sample of samples) {
    latestByMetric.set(sample.name, sample.value);
  }

  const firing: FiringAlert[] = [];
  for (const rule of rules) {
    const value = latestByMetric.get(rule.metric);
    if (value === undefined) continue;
    if (compareThreshold(value, rule.comparator, rule.threshold)) {
      firing.push({
        rule,
        value,
        pagePagerDuty: rule.pagerduty && rule.severity === "critical",
      });
    }
  }
  return firing;
}

export function pagerdutyEvent(alert: FiringAlert, source = "prompt-mint"): Record<string, unknown> {
  const severity = alert.rule.severity === "critical" ? "critical" : "warning";
  return {
    routing_key: "",
    event_action: "trigger",
    dedup_key: `prompt-mint:${alert.rule.id}`,
    payload: {
      summary: `${alert.rule.name}: ${alert.rule.description} (value=${alert.value}, threshold=${alert.rule.threshold})`,
      severity,
      source,
      component: alert.rule.metric,
      group: "prompt-mint",
      class: alert.rule.id,
      custom_details: {
        metric: alert.rule.metric,
        value: alert.value,
        threshold: alert.rule.threshold,
        window: alert.rule.window,
        runbook: alert.rule.runbook,
      },
    },
    links: [{ href: alert.rule.runbook, text: "Monitoring runbook" }],
  };
}

export function criticalPagerDutyRules(): AlertRule[] {
  return ALERT_RULES.filter((rule) => rule.severity === "critical" && rule.pagerduty);
}
