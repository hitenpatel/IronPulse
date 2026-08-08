export function assertHealth(body, expectedSha) {
  if (body.services?.db?.status !== "ok") throw new Error(`db unhealthy: ${JSON.stringify(body.services?.db)}`);
  if (body.services?.redis?.status !== "ok") throw new Error(`redis unhealthy: ${JSON.stringify(body.services?.redis)}`);
  if (expectedSha && body.sha !== expectedSha) {
    throw new Error(`sha mismatch: deployed ${body.sha}, expected ${expectedSha}`);
  }
}

const [, , url, expectedSha] = process.argv;
if (url) {
  const resp = await fetch(`${url.replace(/\/$/, "")}/api/health`, { signal: AbortSignal.timeout(15_000) });
  const body = await resp.json();
  if (resp.status !== 200) {
    console.error(`health returned HTTP ${resp.status}: ${JSON.stringify(body)}`);
    process.exit(1);
  }
  try {
    assertHealth(body, expectedSha);
    console.log(`health ok — sha ${body.sha}`);
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }
}
