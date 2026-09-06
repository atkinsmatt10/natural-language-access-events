import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { executeAccessQuery } from "../lib/query-security";

test("PostgreSQL executes supported analytics and enforces row/transaction boundaries", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE access_events (
        id serial primary key, door_name text, full_name text,
        local_timestamp timestamp, credential_type text, code text
      );
      INSERT INTO access_events (door_name,full_name,local_timestamp,credential_type,code)
      SELECT 'Main', 'John Smith', NOW() - INTERVAL '1 day', 'mobile', 'granted_full'
      FROM generate_series(1,1500);
    `);
    // These are the user-facing examples the application asks its model to support.
    const source = readFileSync(new URL('../app/actions.ts', import.meta.url), 'utf8');
    const examples = source.slice(source.indexOf('EXAMPLE QUERIES:'), source.indexOf('ANALYTICAL QUERY GUIDELINES:')).match(/SELECT[\s\S]*?;/g)!;
    let released = 0;
    const connect = async () => ({
      query: (text: string) => db.query<Record<string, unknown>>(text),
      release: () => { released++; },
    });
    assert.equal(examples.length, 5);
    for (const query of examples) await executeAccessQuery(query, connect);
    const rows = await executeAccessQuery('SELECT * FROM access_events', connect);
    assert.equal(rows.length, 1000);
    assert.equal(released, examples.length + 1);
    await db.exec('BEGIN READ ONLY');
    await assert.rejects(db.query('DELETE FROM access_events'), /read-only/);
    await db.exec('ROLLBACK');
    const count = await db.query<{ count: number }>('SELECT COUNT(*)::integer AS count FROM access_events');
    assert.equal(count.rows[0].count, 1500);
  } finally {
    await db.close();
  }
});
