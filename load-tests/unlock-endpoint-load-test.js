import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics for unlock endpoint performance
const unlockLatency = new Trend("unlock_request_duration", true);
const unlockSuccessRate = new Rate("unlock_success_rate");
const rateLimitRate = new Rate("unlock_rate_limited");
const authFailureRate = new Rate("unlock_auth_failures");

export const options = {
  scenarios: {
    // Stage 1: Moderate load (100 VUs)
    moderate_load: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "15s", target: 0 },
      ],
      gracefulStop: "5s",
      tags: { load_profile: "100_users" },
    },
    // Stage 2: Heavy load (500 VUs)
    heavy_load: {
      executor: "ramping-vus",
      startVUs: 1,
      startTime: "2m",
      stages: [
        { duration: "30s", target: 500 },
        { duration: "1m", target: 500 },
        { duration: "15s", target: 0 },
      ],
      gracefulStop: "5s",
      tags: { load_profile: "500_users" },
    },
    // Stage 3: Stress / Spike load (1000 VUs)
    stress_load: {
      executor: "ramping-vus",
      startVUs: 1,
      startTime: "4m",
      stages: [
        { duration: "30s", target: 1000 },
        { duration: "1m", target: 1000 },
        { duration: "15s", target: 0 },
      ],
      gracefulStop: "5s",
      tags: { load_profile: "1000_users" },
    },
  },
  thresholds: {
    unlock_request_duration: ["p(50)<300", "p(95)<800", "p(99)<1500"],
    unlock_success_rate: ["rate>0.95"],
    unlock_rate_limited: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";

function generateSyntheticIp(vuIndex) {
  const segment3 = Math.floor(vuIndex / 250) % 250;
  const segment4 = (vuIndex % 250) + 1;
  return `198.51.${segment3}.${segment4}`;
}

export default function () {
  const vuId = __VU;
  const clientIp = generateSyntheticIp(vuId);
  const walletAddress = `GBUYER${String(vuId).padStart(52, "0")}`;
  const promptId = String((vuId % 50) + 1);

  const payload = JSON.stringify({
    token: `mock-token-vu-${vuId}`,
    promptId: promptId,
    address: walletAddress,
    signedMessage: `mock-signature-vu-${vuId}`,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": clientIp,
      "User-Agent": "k6-unlock-load-tester/1.0",
    },
    tags: { name: "PostUnlock" },
  };

  const response = http.post(`${BASE_URL}/api/prompts/unlock`, payload, params);

  unlockLatency.add(response.timings.duration);
  unlockSuccessRate.add(response.status === 200);
  rateLimitRate.add(response.status === 429);
  authFailureRate.add(response.status === 401 || response.status === 403);

  check(response, {
    "status is 200 or expected rate limit": (r) => r.status === 200 || r.status === 429 || r.status === 401,
    "response duration < 1500ms": (r) => r.timings.duration < 1500,
  });

  sleep(1);
}

export function handleSummary(data) {
  const results = {
    timestamp: new Date().toISOString(),
    metrics: {
      http_req_duration: data.metrics.http_req_duration,
      unlock_request_duration: data.metrics.unlock_request_duration,
      unlock_success_rate: data.metrics.unlock_success_rate,
      unlock_rate_limited: data.metrics.unlock_rate_limited,
    },
  };

  return {
    stdout: JSON.stringify(results, null, 2),
    "load-tests/unlock-benchmark-report.json": JSON.stringify(results, null, 2),
  };
}
