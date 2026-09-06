import { parse, toSql } from "pgsql-ast-parser";

export const MAX_QUERY_LENGTH = 10_000;
export const MAX_RESULT_ROWS = 1_000;
const functions = new Set([
  "count", "sum", "avg", "min", "max", "lower", "upper", "length",
  "date_trunc", "date_part", "now", "round", "abs", "floor", "ceil",
  "coalesce", "nullif", "string_agg", "to_char", "greatest", "least",
]);
const types = new Set([
  "text", "varchar", "integer", "int", "int4", "bigint", "int8", "numeric",
  "decimal", "real", "float8", "double precision", "boolean", "bool",
  "date", "timestamp", "timestamptz", "interval", "time",
]);
const nodes = new Set([
  "select", "table", "ref", "call", "cast", "binary", "unary", "ternary",
  "case", "extract", "list", "string", "integer", "numeric", "boolean",
  "null", "keyword",
]);
const invalid = () => new Error("Only bounded access_events SELECT queries are allowed");

/** Parse and reserialize an allowlisted SQL subset; model output is untrusted. */
export function validateAccessQuery(input: unknown): string {
  if (typeof input !== "string" || !input.trim() || input.length > MAX_QUERY_LENGTH) {
    throw invalid();
  }
  try {
    const statements = parse(input);
    if (statements.length !== 1 || statements[0].type !== "select") throw invalid();
    const statement = statements[0];
    let count = 0;
    const visit = (value: unknown, depth = 0): void => {
      if (++count > 2_000 || depth > 40) throw invalid();
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach((child) => visit(child, depth + 1));
        return;
      }
      const node = value as Record<string, any>;
      if (node.type && !nodes.has(node.type)) throw invalid();
      if (node.type === "select") {
        // One base table, no joins, CTEs, unions, locks or set-returning functions.
        if (node.for || node.skip || node.from?.length !== 1 || node.from[0].type !== "table") throw invalid();
      }
      if (node.type === "table") {
        if (node.name.name !== "access_events" ||
            (node.name.schema && node.name.schema !== "public") ||
            node.join || node.lateral || node.name.columnNames) throw invalid();
        node.name.schema = "public";
      }
      if (node.type === "call") {
        if (!functions.has(node.function.name) || (node.function.schema && node.function.schema !== "pg_catalog") || node.over) throw invalid();
        // Resolve built-ins independently of the database user's search_path.
        if (!["coalesce", "nullif", "greatest", "least"].includes(node.function.name)) {
          node.function.schema = "pg_catalog";
        }
      }
      if (node.type === "cast" && (!types.has(node.to.name) || node.to.schema || node.to.kind === "array")) throw invalid();
      if (node.opSchema) throw invalid();
      if (node.type === "keyword" && !["current_date", "current_timestamp", "current_time", "localtimestamp", "localtime"].includes(node.keyword)) throw invalid();
      for (const child of Object.values(node)) visit(child, depth + 1);
    }
    visit(statement);
    // Execute only canonical SQL emitted from the validated AST, never raw input.
    return toSql.statement(statement).replace(/;\s*$/, "");
  } catch {
    throw invalid();
  }
}

export interface QueryClient {
  query(text: string): Promise<{ rows: Record<string, unknown>[] }>;
  release(error?: boolean): void;
}

export async function executeAccessQuery(input: unknown, connect: () => Promise<QueryClient>) {
  const query = validateAccessQuery(input);
  const client = await connect();
  let discard = false;
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '5s'");
    await client.query("SET LOCAL lock_timeout = '1s'");
    await client.query("SET LOCAL search_path = pg_catalog");
    const result = await client.query(`SELECT * FROM (${query}) AS access_results LIMIT ${MAX_RESULT_ROWS}`);
    await client.query("COMMIT");
    return result.rows;
  } catch {
    try { await client.query("ROLLBACK"); } catch { discard = true; }
    throw new Error("Unable to retrieve access events");
  } finally {
    client.release(discard);
  }
}
