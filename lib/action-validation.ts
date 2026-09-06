import { z } from "zod";
import { MAX_QUERY_LENGTH, MAX_RESULT_ROWS } from "./query-security";

export const questionSchema = z.string().trim().min(1).max(2_000);
export const sqlInputSchema = z.string().trim().min(1).max(MAX_QUERY_LENGTH);
export const resultsSchema = z.array(
  z.record(z.string().max(128), z.union([z.string().max(10_000), z.number().finite(), z.boolean(), z.date(), z.null()]))
    .refine((row) => Object.keys(row).length <= 30, "Too many columns"),
).max(MAX_RESULT_ROWS).refine((rows) => JSON.stringify(rows).length <= 500_000, "Results are too large");
