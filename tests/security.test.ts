import test from "node:test";
import assert from "node:assert/strict";
import { validateAccessQuery, executeAccessQuery, QueryClient } from "../lib/query-security";
import { validCredentials } from "../lib/auth-credentials";
import { chartStyles } from "../lib/chart-styles";
import { questionSchema, resultsSchema } from "../lib/action-validation";

const valid = [
  "SELECT * FROM access_events;",
  "SELECT full_name FROM access_events WHERE LOWER(full_name) ILIKE LOWER('%john%') AND EXTRACT(HOUR FROM local_timestamp) BETWEEN 9 AND 16 ORDER BY local_timestamp DESC",
  "SELECT door_name, COUNT(*), STRING_AGG(DISTINCT full_name, ', ' ORDER BY full_name) FROM access_events GROUP BY door_name",
  "SELECT DATE_TRUNC('month', local_timestamp), ROUND(COUNT(CASE WHEN credential_type = 'mobile' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) FROM access_events WHERE local_timestamp >= NOW() - INTERVAL '1 month' GROUP BY DATE_TRUNC('month', local_timestamp)",
  "SELECT full_name FROM access_events WHERE full_name = 'Robert; DROP TABLE access_events; --'",
];
for (const query of valid) test(`allows analytics: ${query.slice(0, 65)}`, () => {
  const canonical = validateAccessQuery(query);
  assert.match(canonical, /public\.access_events/);
  assert.equal(validateAccessQuery(canonical), canonical);
});
const invalid = [
  "SELECT * FROM access_events; SELECT * FROM pg_authid",
  "SELECT * FROM access_events; COMMIT; SELECT pg_sleep(20)",
  "SELECT * FROM pg_authid", "SELECT * FROM private.access_events",
  "SELECT pg_read_file('/etc/passwd') FROM access_events",
  "SELECT pg_sleep(30) FROM access_events",
  "SELECT set_config('transaction_read_only', 'off', false) FROM access_events",
  "SELECT nextval('access_events_id_seq') FROM access_events",
  "SELECT public.lower(full_name) FROM access_events",
  "SELECT full_name::regclass FROM access_events",
  "SELECT full_name::evil.text FROM access_events",
  "SELECT * FROM access_events FOR SHARE",
  "WITH changed AS (DELETE FROM access_events RETURNING *) SELECT * FROM changed",
  "SELECT * FROM access_events UNION SELECT * FROM other_table",
  "SELECT (SELECT password FROM users) FROM access_events",
  "SELECT * FROM access_events a CROSS JOIN access_events b",
  "SELECT * INTO copied FROM access_events",
  "SELECT * FROM generate_series(1,1000000000)",
  "SELECT current_user FROM access_events",
  "SELECT * FROM access_events WHERE full_name OPERATOR(public.=) 'x'",
  "SELECT 1", "SELECT " + "(".repeat(11_000), null, {}, "",
];
for (const query of invalid) test(`rejects unsafe SQL: ${String(query).slice(0, 85)}`, () => assert.throws(() => validateAccessQuery(query)));

test("invalid queries cannot acquire a database connection", async () => {
  await assert.rejects(executeAccessQuery("SELECT pg_sleep(20)", async () => { throw new Error("must not connect"); }), /Only bounded/);
});
function mockClient(fail = false, failRollback = false) {
  const calls: string[] = [];
  let released: boolean | undefined;
  const client: QueryClient = {
    async query(text) {
      calls.push(text);
      if ((fail && text.startsWith("SELECT")) || (failRollback && text === "ROLLBACK")) throw new Error("sensitive database details");
      return { rows: text.startsWith("SELECT") ? [{ full_name: "Example" }] : [] };
    },
    release(discard) { released = discard; },
  };
  return { client, calls, released: () => released };
}
test("executes once in a bounded read-only transaction and releases the connection", async () => {
  const mock = mockClient();
  assert.deepEqual(await executeAccessQuery(valid[0], async () => mock.client), [{ full_name: "Example" }]);
  assert.equal(mock.calls[0], "BEGIN READ ONLY");
  assert.ok(mock.calls.includes("SET LOCAL statement_timeout = '5s'"));
  assert.ok(mock.calls.includes("SET LOCAL search_path = pg_catalog"));
  assert.equal(mock.calls.filter(c => c.startsWith("SELECT")).length, 1);
  assert.match(mock.calls.at(-2)!, /LIMIT 1000$/);
  assert.equal(mock.calls.at(-1), "COMMIT");
  assert.equal(mock.released(), false);
});
test("rolls back failures and does not leak database errors", async () => {
  const mock = mockClient(true);
  await assert.rejects(executeAccessQuery(valid[0], async () => mock.client), /^Error: Unable to retrieve access events$/);
  assert.equal(mock.calls.at(-1), "ROLLBACK");
  assert.equal(mock.released(), false);
});
test("discards connections when rollback fails", async () => {
  const mock = mockClient(true, true);
  await assert.rejects(executeAccessQuery(valid[0], async () => mock.client));
  assert.equal(mock.released(), true);
});
test("authentication fails closed and accepts only configured credentials", async () => {
  const password = "test-credential-".repeat(4);
  const header = `Basic ${btoa(`analyst:${password}`)}`;
  assert.equal(await validCredentials(header, "analyst", password), true);
  for (const bad of [null, "", "Basic invalid!", `Basic ${btoa('analyst:wrong')}`, `Basic ${btoa(`other:${password}`)}`]) {
    assert.equal(await validCredentials(bad, "analyst", password), false);
  }
  assert.equal(await validCredentials(header, undefined, undefined), false);
  assert.equal(await validCredentials(header, "analyst", "short"), false);
});
test("chart CSS rejects HTML/CSS injection while preserving palette colors", () => {
  const css = chartStyles("chart-123", {
    count: { color: "hsl(var(--chart-1))" },
    ['x}</style><script>alert(1)</script>']: { color: "red" },
    evil: { color: "red;}body{background:url(https://evil.example)" },
  });
  assert.match(css, /--color-count: hsl\(var\(--chart-1\)\)/);
  assert.doesNotMatch(css, /script|evil|url\(/);
  assert.equal(chartStyles('x] {color:red}', {}), "");
});
test("action payloads are bounded at runtime", () => {
  assert.equal(questionSchema.safeParse("x".repeat(2001)).success, false);
  assert.equal(resultsSchema.safeParse(Array(1001).fill({ count: 1 })).success, false);
  assert.equal(resultsSchema.safeParse([{ value: "x".repeat(10_001) }]).success, false);
  assert.equal(resultsSchema.safeParse([{ count: 4, value: null, local_timestamp: new Date(), granted: true }]).success, true);
});
