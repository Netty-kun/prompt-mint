# Monitoring and alerting (Datadog / Grafana / PagerDuty)

This guide covers GitHub issue **#235**: production dashboards for RPC latency, error rates, active users, transaction volume, and API endpoint health, plus PagerDuty pages for critical thresholds.

## Signals

| Signal | Metric | Critical threshold | Pages PagerDuty |
| --- | --- | --- | --- |
| RPC call latency | `rpc_call_duration_ms` P99 | > 2000 ms for 5m | Yes |
| Error rates | `api_request_error_total` | > 5/sec for 5m | Yes |
| API endpoint health | `api_endpoint_health` | gauge `< 1` for 2m | Yes |
| Active users | `active_users_total` | 0 for 15m | No (warning) |
| Transaction volume | `transaction_volume_total` | 0 for 15m | No (warning) |

Canonical thresholds live in `src/lib/observability/alerting.ts` and must stay in sync with:

- `docs/observability/alerts.yml` (Prometheus / Grafana)
- `docs/observability/datadog-monitors.json`
- `docs/observability/alertmanager.yml` (PagerDuty receiver)

## Grafana

1. Start the app stack, then the monitoring overlay:

   ```bash
   docker compose up -d
   docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
   ```

2. Open Grafana at [http://localhost:3001](http://localhost:3001) (admin / admin by default).
3. The **PromptMint production** dashboard is provisioned from `docs/observability/grafana-dashboard.json`.
4. You can also import `docs/observability/dashboard.json` into an existing Grafana Cloud org.

Prometheus scrapes `GET /api/metrics` (Prometheus text format).

## Datadog

1. Set `DATADOG_API_KEY` and `DATADOG_APP_KEY`.
2. Import `docs/observability/datadog-dashboard.json` as a dashboard.
3. Import `docs/observability/datadog-monitors.json` as monitors.
4. Connect the Datadog PagerDuty integration so `@pagerduty-promptmint` on **priority 1** monitors pages the on-call.

Structured logs already emit `{ metric: { name, value, labels } }` from `src/lib/observability/metrics.ts`, which a Datadog log pipeline can turn into custom metrics.

## PagerDuty

Alertmanager (`docs/observability/alertmanager.yml`) routes `severity=critical` + `pagerduty=true` to Events API v2 using `PAGERDUTY_ROUTING_KEY`.

Create a PagerDuty service named **PromptMint production** with:

- Integration: Events API v2
- Escalation: platform on-call (SEV-1 < 15 minutes, see [deployment-runbook.md](./deployment-runbook.md))
- Datadog integration handle: `@pagerduty-promptmint`

Critical pages:

- RPC P99 > 2s
- API 5xx rate > 5/sec
- Any scraped endpoint unhealthy

## Local checks

```bash
yarn test:frontend src/lib/observability/alerting.test.ts src/lib/observability/metrics.test.ts src/lib/ops/rollback.test.ts
curl -s http://localhost:5173/api/metrics
```
