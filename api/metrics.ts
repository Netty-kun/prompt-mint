import { withObservability } from "../src/lib/observability/wrapper";
import { metrics } from "../src/lib/observability/metrics";

async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const body = metrics.toPrometheus();
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(body);
}

export default withObservability(handler, "metrics");
