/**
 * CLI entry used by `.github/workflows/auto-rollback.yml`.
 * Adapters talk to Vercel / GitHub / Slack / Discord; orchestration stays pure.
 */

import {
  executeRollback,
  parseCiFailureEvent,
  type RollbackDependencies,
} from "./rollback";
import {
  createFetchHttpClient,
  createGitHubIncident,
  deliverNotification,
  listVercelProductionDeployments,
  vercelInstantRollback,
} from "./rollbackAdapters";

export function envFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

export async function runRollbackCli(
  env: Record<string, string | undefined> = process.env,
  argv: string[] = process.argv,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; result: unknown }> {
  const dryRun = envFlag(argv, "--dry-run") || env.ROLLBACK_DRY_RUN === "true";
  const event = parseCiFailureEvent(env);
  const http = createFetchHttpClient(fetchImpl);

  const vercelToken = env.VERCEL_TOKEN || "";
  const vercelProjectId = env.VERCEL_PROJECT_ID || "";
  const vercelTeamId = env.VERCEL_ORG_ID || env.VERCEL_TEAM_ID || "";
  const githubToken = env.GITHUB_TOKEN || "";
  const repository = env.GITHUB_REPOSITORY || "";

  const webhooks = {
    slack: env.SLACK_WEBHOOK_URL,
    discord: env.DISCORD_WEBHOOK_URL,
  };

  const missingPlatform =
    !vercelToken || !vercelProjectId
      ? "VERCEL_TOKEN/VERCEL_PROJECT_ID"
      : !githubToken || !repository
        ? "GITHUB_TOKEN/GITHUB_REPOSITORY"
        : null;

  const deps: RollbackDependencies = {
    dryRun: dryRun || Boolean(missingPlatform),
    async listProductionDeployments() {
      if (!vercelToken || !vercelProjectId) return [];
      return listVercelProductionDeployments(http, {
        token: vercelToken,
        projectId: vercelProjectId,
        teamId: vercelTeamId || undefined,
      });
    },
    async rollbackTo(deploymentId) {
      if (!vercelToken || !vercelProjectId) {
        return { rolledBackTo: deploymentId };
      }
      return vercelInstantRollback(http, {
        token: vercelToken,
        projectId: vercelProjectId,
        deploymentId,
        teamId: vercelTeamId || undefined,
      });
    },
    async notify(payload) {
      return deliverNotification(http, payload, webhooks);
    },
    async createIncident(ticket) {
      if (!githubToken || !repository) {
        return { url: event.runUrl, number: 0 };
      }
      return createGitHubIncident(http, { token: githubToken, repository, ticket });
    },
  };

  const result = await executeRollback(event, deps);
  return { ok: result.outcome !== "incident_only" || Boolean(result.incident), result };
}
