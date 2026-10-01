import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  },
);
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
const origin = "http://127.0.0.1:3100";
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(origin);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert(ready, logs);
  for (const route of [
    "/",
    "/ask",
    "/schemes",
    "/schemes/naan-mudhalvan",
    "/timeline",
    "/data",
    "/sources",
    "/departments",
    "/about",
    "/search",
    "/admin",
    "/admin/verification",
  ]) {
    const r = await fetch(origin + route);
    assert.equal(r.status, 200, route);
    const text = await r.text();
    assert(text.length > 1000, route);
    console.log("PASS route", route);
  }
  for (const [question, expected] of [
    ["When was Naan Mudhalvan launched?", "1 March 2022"],
    ["நான் முதல்வன் திட்டத்தால் மாணவர்களுக்கு என்ன பயன்?", "TNSDC"],
    [
      "How many obtained employment under Naan Mudhalvan?",
      "I don't have enough verified evidence",
    ],
  ]) {
    const r = await fetch(origin + "/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    assert.equal(r.status, 200);
    const result = await r.json();
    assert(result.direct.includes(expected), JSON.stringify(result));
    console.log("PASS API", question);
  }
  const admin = await fetch(origin + "/api/admin");
  assert.equal(admin.status, 401);
  console.log("PASS admin rejects anonymous access");
} finally {
  server.kill("SIGTERM");
}
