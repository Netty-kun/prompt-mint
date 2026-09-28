import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildIncidentTicket,
  buildNotificationPayload,
  discordWebhookBody,
  executeRollback,
  parseCiFailureEvent,
  selectLastKnownGood,
  shouldTriggerRollback,
  slackWebhookBody,
  type CiFailureEvent,
  type DeploymentRecord,
  type RollbackDependencies,
} from "./rollback";
import { createFetchHttpClient, mapVercelDeployment } from "./rollbackAdapters";
import { envFlag, runRollbackCli } from "./rollbackCli";

const failedEvent: CiFailureEvent = {
  workflowName: "Deploy - Frontend to Vercel and Artifacts",
  conclusion: "failure",
  runId: 99,
  runUrl: "https://github.com/org/repo/actions/runs/99",
  sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ref: "refs/heads/main",
  actor: "ci-bot",
  environment: "production",
};

function goodDeploy(overrides: Partial<DeploymentRecord> = {}): DeploymentRecord {
  return {
    id: "dpl_good",
    sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    createdAt: "2026-08-26T12:00:00.000Z",
    state: "READY",
    production: true,
    url: "https://promptmint.vercel.app",
    ...overrides,
  };
}

function mockDeps(overrides: Partial<RollbackDependencies> = {}): RollbackDependencies & {
  notify: ReturnType<typeof vi.fn>;
  createIncident: ReturnType<typeof vi.fn>;
  rollbackTo: ReturnType<typeof vi.fn>;
  listProductionDeployments: ReturnType<typeof vi.fn>;
} {
  const notify = vi.fn(async (payload) => payload.channel);
  const createIncident = vi.fn(async () => ({ url: "https://github.com/org/repo/issues/1", number: 1 }));
  const rollbackTo = vi.fn(async (id: string) => ({ rolledBackTo: id }));
  const listProductionDeployments = vi.fn(async () => [goodDeploy()]);
  return {
    notify,
    createIncident,
    rollbackTo,
    listProductionDeployments,
    ...overrides,
  } as any;
}

describe("shouldTriggerRollback", () => {
  it("triggers on a failed production deploy workflow on main", () => {
    expect(shouldTriggerRollback(failedEvent)).toBe(true);
  });

  it("triggers on timed_out deploys", () => {
    expect(shouldTriggerRollback({ ...failedEvent, conclusion: "timed_out" })).toBe(true);
  });

  it("ignores cancelled, skipped, and successful runs", () => {
    expect(shouldTriggerRollback({ ...failedEvent, conclusion: "cancelled" })).toBe(false);
    expect(shouldTriggerRollback({ ...failedEvent, conclusion: "skipped" })).toBe(false);
    expect(shouldTriggerRollback({ ...failedEvent, conclusion: "success" })).toBe(false);
  });

  it("ignores non-deploy workflows and non-main branches", () => {
    expect(shouldTriggerRollback({ ...failedEvent, workflowName: "CI" })).toBe(false);
    expect(shouldTriggerRollback({ ...failedEvent, ref: "refs/heads/feat/experiment" })).toBe(false);
    expect(shouldTriggerRollback({ ...failedEvent, environment: "preview" })).toBe(false);
  });
});

describe("selectLastKnownGood", () => {
  it("returns the newest READY production deployment that is not the failed SHA", () => {
    const older = goodDeploy({ id: "old", createdAt: "2026-08-01T00:00:00.000Z", sha: "oldshaoldshaoldshaoldshaoldshaoldshaolds" });
    const newer = goodDeploy({ id: "new", createdAt: "2026-08-20T00:00:00.000Z" });
    const failed = goodDeploy({
      id: "failed",
      sha: failedEvent.sha,
      createdAt: "2026-08-26T00:00:00.000Z",
    });
    const preview = goodDeploy({ id: "preview", production: false, createdAt: "2026-08-25T00:00:00.000Z" });
    const building = goodDeploy({ id: "building", state: "BUILDING", createdAt: "2026-08-25T12:00:00.000Z" });

    const selected = selectLastKnownGood([failed, preview, building, older, newer], failedEvent.sha);
    expect(selected?.id).toBe("new");
  });

  it("returns null when no distinct READY production deployment exists", () => {
    expect(selectLastKnownGood([], failedEvent.sha)).toBeNull();
    expect(
      selectLastKnownGood(
        [goodDeploy({ sha: failedEvent.sha }), goodDeploy({ state: "ERROR", sha: "cccc" })],
        failedEvent.sha,
      ),
    ).toBeNull();
  });

  it("treats short SHA prefixes of the failed commit as the same version", () => {
    const samePrefix = goodDeploy({ sha: failedEvent.sha.slice(0, 7) });
    expect(selectLastKnownGood([samePrefix], failedEvent.sha)).toBeNull();
  });
});

describe("executeRollback", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reverts to last known-good, notifies Slack and Discord, and opens an incident ticket", async () => {
    const deps = mockDeps();
    const result = await executeRollback(failedEvent, deps);

    expect(result.outcome).toBe("rolled_back");
    expect(result.rolledBackTo).toBe("dpl_good");
    expect(deps.rollbackTo).toHaveBeenCalledWith("dpl_good");
    expect(deps.createIncident).toHaveBeenCalledOnce();
    expect(deps.notify).toHaveBeenCalledTimes(2);
    expect(result.notificationsSent).toEqual(["slack", "discord"]);
    expect(result.incident?.number).toBe(1);

    const ticket = deps.createIncident.mock.calls[0][0];
    expect(ticket.title).toContain("SEV-1");
    expect(ticket.body).toContain(failedEvent.sha);
    expect(ticket.labels).toContain("incident");
  });

  it("opens an incident and still notifies when no known-good version exists", async () => {
    const deps = mockDeps({
      listProductionDeployments: vi.fn(async () => []),
    });
    const result = await executeRollback(failedEvent, deps);

    expect(result.outcome).toBe("incident_only");
    expect(deps.rollbackTo).not.toHaveBeenCalled();
    expect(deps.createIncident).toHaveBeenCalledOnce();
    expect(result.notificationsSent).toEqual(["slack", "discord"]);
  });

  it("skips rollback for non-matching CI events without notifying", async () => {
    const deps = mockDeps();
    const result = await executeRollback({ ...failedEvent, workflowName: "Frontend CI" }, deps);
    expect(result.outcome).toBe("skipped");
    expect(deps.rollbackTo).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
    expect(deps.createIncident).not.toHaveBeenCalled();
  });

  it("does not call Vercel rollback in dry-run mode", async () => {
    const deps = mockDeps({ dryRun: true });
    const result = await executeRollback(failedEvent, deps);
    expect(result.outcome).toBe("incident_only");
    expect(result.reason).toMatch(/Dry-run/);
    expect(deps.rollbackTo).not.toHaveBeenCalled();
    expect(deps.createIncident).toHaveBeenCalledOnce();
  });
});

describe("notification payloads", () => {
  it("builds Slack and Discord webhook bodies with incident context", () => {
    const ticket = buildIncidentTicket(failedEvent, goodDeploy(), "rolled_back");
    const payload = buildNotificationPayload(
      failedEvent,
      {
        outcome: "rolled_back",
        reason: "reverted",
        lastKnownGood: goodDeploy(),
        rolledBackTo: "dpl_good",
        incident: { url: "https://github.com/org/repo/issues/1", number: 1 },
      },
      "slack",
    );

    expect(ticket.severity).toBe("SEV-1");
    const slack = slackWebhookBody(payload);
    expect(slack.text).toContain("rolled back");
    expect(Array.isArray((slack as any).attachments)).toBe(true);

    const discord = discordWebhookBody({ ...payload, channel: "discord" });
    expect((discord as any).embeds[0].fields.length).toBeGreaterThan(3);
  });
});

describe("adapters", () => {
  it("maps Vercel deployment payloads and ignores preview targets", () => {
    const mapped = mapVercelDeployment({
      uid: "dpl_1",
      readyState: "READY",
      target: "production",
      createdAt: Date.parse("2026-08-26T00:00:00.000Z"),
      url: "promptmint.vercel.app",
      meta: { githubCommitSha: "abc1234abc1234abc1234abc1234abc1234abc12" },
    });
    expect(mapped).toMatchObject({
      id: "dpl_1",
      production: true,
      state: "READY",
      sha: "abc1234abc1234abc1234abc1234abc1234abc12",
    });

    const preview = mapVercelDeployment({
      uid: "dpl_2",
      readyState: "READY",
      target: "preview",
      createdAt: Date.now(),
      meta: { githubCommitSha: "fff" },
    });
    expect(preview?.production).toBe(false);
  });

  it("parses CI failure events from GitHub Actions env", () => {
    const event = parseCiFailureEvent({
      FAILED_WORKFLOW_NAME: "Deploy - Frontend to Vercel and Artifacts",
      FAILED_CONCLUSION: "failure",
      FAILED_SHA: "deadbeef",
      FAILED_REF: "main",
      FAILED_RUN_ID: "12",
      GITHUB_REPOSITORY: "EDOHWARES/prompt-mint",
      GITHUB_SERVER_URL: "https://github.com",
    });
    expect(event.sha).toBe("deadbeef");
    expect(event.runUrl).toContain("/actions/runs/12");
  });

  it("createFetchHttpClient posts JSON and parses responses", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const http = createFetchHttpClient(fetchImpl as unknown as typeof fetch);
    const res = await http.postJson("https://example.test/hook", { hello: "world" });
    expect(res.ok).toBe(true);
    expect(res.json).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.test/hook",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("rollback CLI", () => {
  it("detects --dry-run and degrades to incident-only without Vercel credentials", async () => {
    expect(envFlag(["node", "cli", "--dry-run"], "--dry-run")).toBe(true);

    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }));
    const { result } = await runRollbackCli(
      {
        FAILED_WORKFLOW_NAME: "Deploy - Frontend to Vercel and Artifacts",
        FAILED_CONCLUSION: "failure",
        FAILED_SHA: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        FAILED_REF: "refs/heads/main",
        FAILED_RUN_URL: "https://github.com/org/repo/actions/runs/1",
        GITHUB_REPOSITORY: "org/repo",
        ROLLBACK_DRY_RUN: "true",
      },
      ["--dry-run"],
      fetchImpl as unknown as typeof fetch,
    );

    expect((result as any).outcome).toBe("incident_only");
    expect((result as any).reason).toMatch(/No READY production deployment|Dry-run|would roll back/i);
  });
});
