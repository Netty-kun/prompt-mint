/**
 * Platform adapters for rollback automation. Kept separate from orchestration
 * so unit tests never hit GitHub, Vercel, Slack, or Discord.
 */

import {
  discordWebhookBody,
  slackWebhookBody,
  type DeploymentRecord,
  type DeploymentState,
  type IncidentTicketInput,
  type IncidentTicketResult,
  type NotificationPayload,
} from "./rollback";

export interface HttpClient {
  // eslint-disable-next-line no-unused-vars
  postJson: (url: string, body: unknown, headers?: Record<string, string>) => Promise<{ ok: boolean; status: number; json: any; text: string }>;
  // eslint-disable-next-line no-unused-vars
  getJson: (url: string, headers?: Record<string, string>) => Promise<{ ok: boolean; status: number; json: any; text: string }>;
}

function parseResponseJson(text: string): any {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function createFetchHttpClient(fetchImpl: typeof fetch = fetch): HttpClient {
  return {
    async getJson(url, headers = {}) {
      const res = await fetchImpl(url, { headers });
      const text = await res.text();
      return { ok: res.ok, status: res.status, json: parseResponseJson(text), text };
    },
    async postJson(url, body, headers = {}) {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, json: parseResponseJson(text), text };
    },
  };
}

export function vercelHeaders(token: string, teamId?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    ...(teamId ? { "x-vercel-team-id": teamId } : {}),
  };
}

export function mapVercelDeployment(raw: any): DeploymentRecord | null {
  if (!raw || typeof raw.uid !== "string") return null;
  const sha =
    raw.meta?.githubCommitSha ||
    raw.meta?.gitlabCommitSha ||
    raw.meta?.bitbucketCommitSha ||
    raw.meta?.sha ||
    "";
  const target = raw.target || raw.meta?.target;
  const state = String(raw.readyState || raw.state || "ERROR").toUpperCase() as DeploymentState;
  return {
    id: raw.uid,
    sha: String(sha),
    url: raw.url ? `https://${raw.url}` : undefined,
    createdAt: new Date(typeof raw.createdAt === "number" ? raw.createdAt : Date.now()).toISOString(),
    state: ["READY", "ERROR", "BUILDING", "QUEUED", "CANCELED"].includes(state) ? state : "ERROR",
    production: target === "production",
  };
}

export async function listVercelProductionDeployments(
  http: HttpClient,
  opts: { token: string; projectId: string; teamId?: string },
): Promise<DeploymentRecord[]> {
  const params = new URLSearchParams({
    projectId: opts.projectId,
    target: "production",
    limit: "20",
  });
  const res = await http.getJson(
    `https://api.vercel.com/v6/deployments?${params.toString()}`,
    vercelHeaders(opts.token, opts.teamId),
  );
  if (!res.ok) {
    throw new Error(`Vercel list deployments failed (${res.status}): ${res.text.slice(0, 300)}`);
  }
  const items = Array.isArray(res.json?.deployments) ? res.json.deployments : [];
  return items.map(mapVercelDeployment).filter((d: DeploymentRecord | null): d is DeploymentRecord => d !== null);
}

export async function vercelInstantRollback(
  http: HttpClient,
  opts: { token: string; projectId: string; deploymentId: string; teamId?: string },
): Promise<{ rolledBackTo: string }> {
  const res = await http.postJson(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(opts.projectId)}/rollback/${encodeURIComponent(opts.deploymentId)}`,
    {},
    vercelHeaders(opts.token, opts.teamId),
  );
  if (!res.ok) {
    throw new Error(`Vercel rollback failed (${res.status}): ${res.text.slice(0, 400)}`);
  }
  return { rolledBackTo: opts.deploymentId };
}

export async function createGitHubIncident(
  http: HttpClient,
  opts: { token: string; repository: string; ticket: IncidentTicketInput },
): Promise<IncidentTicketResult> {
  const [owner, repo] = opts.repository.split("/");
  if (!owner || !repo) {
    throw new Error(`GITHUB_REPOSITORY must be owner/repo, got "${opts.repository}"`);
  }

  const attempt = async (labels: string[]) =>
    http.postJson(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        title: opts.ticket.title,
        body: opts.ticket.body,
        labels,
      },
      {
        Authorization: `Bearer ${opts.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    );

  let res = await attempt(opts.ticket.labels);
  if (!res.ok && res.status === 422) {
    res = await attempt([]);
  }
  if (!res.ok) {
    throw new Error(`GitHub issue create failed (${res.status}): ${res.text.slice(0, 400)}`);
  }
  return {
    url: String(res.json.html_url),
    number: Number(res.json.number),
  };
}

export async function deliverNotification(
  http: HttpClient,
  payload: NotificationPayload,
  webhooks: { slack?: string; discord?: string },
): Promise<"slack" | "discord" | null> {
  if (payload.channel === "slack") {
    if (!webhooks.slack) return null;
    const res = await http.postJson(webhooks.slack, slackWebhookBody(payload));
    if (!res.ok) {
      throw new Error(`Slack notify failed (${res.status}): ${res.text.slice(0, 300)}`);
    }
    return "slack";
  }

  if (!webhooks.discord) return null;
  const res = await http.postJson(webhooks.discord, discordWebhookBody(payload));
  if (!res.ok) {
    throw new Error(`Discord notify failed (${res.status}): ${res.text.slice(0, 300)}`);
  }
  return "discord";
}
