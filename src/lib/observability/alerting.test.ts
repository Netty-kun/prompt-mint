import { describe, expect, it } from "vitest";
import {
  ALERT_RULES,
  compareThreshold,
  criticalPagerDutyRules,
  evaluateAlerts,
  pagerdutyEvent,
} from "./alerting";
import dashboard from "../../../docs/observability/dashboard.json";
import datadogDashboard from "../../../docs/observability/datadog-dashboard.json";
import datadogMonitors from "../../../docs/observability/datadog-monitors.json";

const REQUIRED_PANELS = [
  "RPC call latency",
  "Error rates",
  "Active users",
  "Transaction volume",
  "API endpoint health",
];

describe("alert thresholds", () => {
  it("pages PagerDuty for every critical rule", () => {
    const critical = criticalPagerDutyRules();
    expect(critical.length).toBeGreaterThanOrEqual(3);
    expect(critical.every((rule) => rule.pagerduty && rule.severity === "critical")).toBe(true);
    expect(ALERT_RULES.some((rule) => rule.metric === "rpc_call_duration_ms")).toBe(true);
    expect(ALERT_RULES.some((rule) => rule.metric === "api_request_error_total")).toBe(true);
    expect(ALERT_RULES.some((rule) => rule.metric === "api_endpoint_health")).toBe(true);
  });

  it("evaluates gt/lt thresholds against a metrics snapshot", () => {
    expect(compareThreshold(2500, "gt", 2000)).toBe(true);
    expect(compareThreshold(0, "lt", 1)).toBe(true);

    const firing = evaluateAlerts([
      { name: "rpc_call_duration_ms", value: 3500 },
      { name: "api_request_error_total", value: 12 },
      { name: "api_endpoint_health", value: 0 },
      { name: "unlock_failure_total", value: 1 },
    ]);

    const ids = firing.map((f) => f.rule.id);
    expect(ids).toContain("rpc_latency_p99");
    expect(ids).toContain("api_error_rate");
    expect(ids).toContain("endpoint_health");
    expect(ids).not.toContain("unlock_error_rate");
    expect(firing.filter((f) => f.pagePagerDuty).length).toBeGreaterThanOrEqual(3);
  });

  it("builds a PagerDuty Events v2 payload for a firing critical alert", () => {
    const [alert] = evaluateAlerts([{ name: "rpc_call_duration_ms", value: 9000 }]);
    const event = pagerdutyEvent(alert);
    expect((event.payload as any).severity).toBe("critical");
    expect(event.dedup_key).toBe("prompt-mint:rpc_latency_p99");
    expect((event.payload as any).custom_details.metric).toBe("rpc_call_duration_ms");
  });
});

describe("monitoring dashboards", () => {
  it("Grafana dashboard covers the required marketplace panels", () => {
    const titles = (dashboard as { panels: Array<{ title: string }> }).panels.map((p) => p.title);
    for (const required of REQUIRED_PANELS) {
      expect(titles.some((title) => title.toLowerCase().includes(required.toLowerCase()))).toBe(true);
    }
  });

  it("Datadog dashboard and monitors cover the same signals and page PagerDuty", () => {
    const widgets = (datadogDashboard as { widgets: Array<{ definition: { title: string } }> }).widgets;
    const titles = widgets.map((w) => w.definition.title);
    for (const required of REQUIRED_PANELS) {
      expect(titles.some((title) => title.toLowerCase().includes(required.toLowerCase()))).toBe(true);
    }

    const monitors = datadogMonitors as { monitors: Array<{ name: string; priority: number; notifications: string }> };
    const critical = monitors.monitors.filter((m) => m.priority === 1);
    expect(critical.length).toBeGreaterThanOrEqual(3);
    expect(critical.every((m) => m.notifications.includes("@pagerduty"))).toBe(true);
  });
});
