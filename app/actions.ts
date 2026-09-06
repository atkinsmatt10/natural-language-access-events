"use server";

import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { sql } from "@vercel/postgres";
import "server-only";
import { requireAccess } from "@/lib/auth";
import { executeAccessQuery, validateAccessQuery } from "@/lib/query-security";
import { questionSchema, sqlInputSchema, resultsSchema } from "@/lib/action-validation";

// Initialize Gemini
const model = google('gemini-2.5-pro-exp-03-25');

const systemPrompt = `You are a SQL (postgres) expert. Generate queries for an access control system using these guidelines:

IMPORTANT RULES:
1. Always use the access_events table
2. Always include these columns in ALL queries:
   - local_timestamp (when)
   - full_name (who)
   - door_name (where)
   - credential_type (how they accessed)
   - code (whether access was granted/denied)
3. For time conditions, use EXTRACT(HOUR FROM local_timestamp)
4. For name matching, ALWAYS use LOWER(full_name) ILIKE LOWER('%name%') for partial matches
5. Never use exact matches (=) for names

COMMON TIME PATTERNS:
- Business hours: 9 AM to 5 PM (EXTRACT(HOUR FROM local_timestamp) BETWEEN 9 AND 16)
- After hours: Before 9 AM or after 5 PM (EXTRACT(HOUR FROM local_timestamp) < 9 OR EXTRACT(HOUR FROM local_timestamp) >= 17)
- Weekend: EXTRACT(DOW FROM local_timestamp) IN (0, 6)

EXAMPLE QUERIES:

1. "Show John's after-hours access"
SELECT 
    local_timestamp,
    full_name,
    door_name,
    credential_type,
    code
FROM access_events 
WHERE 
    LOWER(full_name) ILIKE LOWER('%john%')
    AND (EXTRACT(HOUR FROM local_timestamp) < 9 
    OR EXTRACT(HOUR FROM local_timestamp) >= 17)
ORDER BY local_timestamp DESC;

2. "Show all access by someone named Smith"
SELECT 
    local_timestamp,
    full_name,
    door_name,
    credential_type,
    code
FROM access_events 
WHERE 
    LOWER(full_name) ILIKE LOWER('%smith%')
ORDER BY local_timestamp DESC;

3. "Show after-hours access in the last month"
SELECT 
    local_timestamp,
    full_name,
    door_name,
    credential_type,
    code
FROM access_events 
WHERE 
    (EXTRACT(HOUR FROM local_timestamp) < 9 
    OR EXTRACT(HOUR FROM local_timestamp) >= 17)
    AND local_timestamp >= NOW() - INTERVAL '1 month'
ORDER BY local_timestamp DESC;

4. "Show distribution of credential types by door"
SELECT 
    door_name,
    credential_type,
    COUNT(*) as access_count,
    MAX(local_timestamp) as latest_access,
    STRING_AGG(DISTINCT full_name, ', ' ORDER BY full_name) as users,
    STRING_AGG(DISTINCT code, ', ') as access_codes
FROM access_events 
GROUP BY door_name, credential_type
ORDER BY door_name, credential_type;

5. "Show trend of mobile credential adoption over time"
SELECT 
    DATE_TRUNC('month', local_timestamp) as month,
    COUNT(*) as total_accesses,
    COUNT(CASE WHEN credential_type = 'mobile' THEN 1 END) as mobile_accesses,
    ROUND(COUNT(CASE WHEN credential_type = 'mobile' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as mobile_percentage,
    STRING_AGG(DISTINCT full_name, ', ') as users
FROM access_events
GROUP BY DATE_TRUNC('month', local_timestamp)
ORDER BY month DESC;

ANALYTICAL QUERY GUIDELINES:
- Use appropriate aggregate functions (COUNT, MAX, MIN, AVG) for non-grouped columns
- Use STRING_AGG for combining text fields in GROUP BY queries
- Use DATE_TRUNC for time-based grouping
- Include relevant user information using STRING_AGG when grouping
- Always include appropriate time ranges for trending data

Remember:
- ALWAYS include full_name in the SELECT clause
- ALWAYS use ILIKE for name matching (never use =)
- Business hours are 9 AM to 5 PM
- Always ORDER BY local_timestamp DESC for history queries
- Include all relevant columns for context`;

export const generateQuery = async (input: string) => {
  await requireAccess();
  input = questionSchema.parse(input);
  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: `Generate a SQL query for this request: ${input}. Return ONLY SQL.`,
      temperature: 0.2,
      maxOutputTokens: 2_000,
      abortSignal: AbortSignal.timeout(30_000),
      maxRetries: 1,
    });
    const response = result.text.trim().replace(/^```(?:sql)?\s*/i, "").replace(/\s*```$/, "");
    return validateAccessQuery(response);
  } catch {
    throw new Error("Failed to generate query");
  }
};

export const runGenerateSQLQuery = async (query: string) => {
  await requireAccess();
  return await executeAccessQuery(query, () => sql.connect()) as Result[];
};

export const explainQuery = async (input: string, sqlQuery: string) => {
  await requireAccess();
  input = questionSchema.parse(input);
  sqlQuery = sqlInputSchema.parse(sqlQuery);
  try {
    const systemPrompt = `You are a SQL (postgres) expert. Your job is to explain to the user write a SQL query you wrote to retrieve the data they asked for. The table schema is as follows:
    access_events (
      id SERIAL PRIMARY KEY,
      door_name VARCHAR(255) NOT NULL,
      controller_name VARCHAR(255) NOT NULL,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      local_timestamp TIMESTAMP(6) NOT NULL,
      code VARCHAR(255) NOT NULL,
      credential_type VARCHAR(255) NOT NULL
    );

    When you explain you must take a section of the query, and then explain it. Each "section" should be unique. So in a query like: "SELECT COUNT(*), credential_type FROM access_events GROUP BY credential_type", the sections could be "SELECT COUNT(*), credential_type", "FROM access_events", "GROUP BY credential_type".
    If a section doesn't have any explanation, include it, but leave the explanation empty.

    Return a JSON object with sections array where each section has a "text" and "explanation" field.
    `;

    const result = await generateObject({
      model,
      maxOutputTokens: 2_000,
      abortSignal: AbortSignal.timeout(30_000),
      maxRetries: 1,
      schema: explanationsSchema,
      prompt: `${systemPrompt}\n\nUser Query:\n${input}\n\nGenerated SQL Query:\n${sqlQuery}`
    });

    return { explanations: result.object };
  } catch (e) {
    console.error("AI request failed");
    throw new Error("Failed to generate query explanation");
  }
};

export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
) => {
  await requireAccess();
  
  userQuery = questionSchema.parse(userQuery);
  resultsSchema.parse(results);

  // Early return if no results
  if (!results || !results.length) {
    console.warn('No results provided to chart configuration');
    const fallbackConfig: Config = {
      type: "bar",
      title: "No Data Available",
      description: "No data available to visualize",
      takeaway: "No data available for analysis",
      xKey: "category",
      yKeys: ["value"],
      colors: { value: `hsl(var(--chart-1))` },
      legend: false
    };
    return { config: fallbackConfig };
  }

  try {
    // Limit the number of results to prevent token overflow
    const limitedResults = results.slice(0, 100);
    
    // Safely get the first result and its keys
    const firstResult = limitedResults[0];
    if (!firstResult) {
      throw new Error("No data available for visualization");
    }

    // Get the structure of the data
    const dataStructure = Object.entries(firstResult).map(([key, value]) => ({
      key,
      type: typeof value
    }));

    // Analyze data types
    const timeColumns = Object.keys(firstResult).filter(key => 
      key.toLowerCase().includes('timestamp') || 
      key.toLowerCase().includes('date') ||
      key.toLowerCase().includes('time')
    );

    const numericalColumns = Object.keys(firstResult).filter(key => 
      typeof firstResult[key] === 'number' ||
      !isNaN(Number(firstResult[key]))
    );

    const categoricalColumns = Object.keys(firstResult).filter(key => 
      typeof firstResult[key] === 'string' &&
      !timeColumns.includes(key)
    );

    const dataAnalysis = {
      timeColumns,
      numericalColumns,
      categoricalColumns,
      hasTimeData: timeColumns.length > 0,
      hasCategoricalData: categoricalColumns.length > 0,
      hasNumericalData: numericalColumns.length > 0
    };

    const systemPrompt = `You are a data visualization expert specializing in access control systems. 
      Return a JSON object with this exact structure:
      {
        "type": "bar" | "line" | "pie",
        "title": string,
        "description": string,
        "takeaway": string,
        "xKey": string,
        "yKeys": string[],
        "legend": boolean
      }

      Common visualization patterns:
      - Bar charts for access counts by door or credential type
      - Line charts for access patterns over time
      - Pie charts for credential type distribution
      - Heat maps for busy access times
      - Stacked bar charts for comparing access codes
      
      Guidelines:
      - Time-series data should use line charts
      - Categorical comparisons should use bar charts
      - Distribution analysis should use pie charts
      - Multiple metrics over time should use multi-line charts
    `;

    const result = await generateObject({
      model,
      maxOutputTokens: 2_000,
      abortSignal: AbortSignal.timeout(30_000),
      maxRetries: 1,
      schema: configSchema,
      prompt: `
        ${systemPrompt}

        User Query: ${userQuery}

        Data Structure:
        ${JSON.stringify(dataStructure, null, 2)}

        Data Analysis:
        ${JSON.stringify(dataAnalysis, null, 2)}

        Sample Data:
        ${JSON.stringify(limitedResults.slice(0, 5), null, 2)}

        Generate a chart configuration JSON object following the structure specified above.
      `,
      temperature: 0.2,
    });

    const colors: Record<string, string> = {};
    result.object.yKeys.forEach((key: string, index: number) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });

    return { 
      config: { 
        ...result.object, 
        colors 
      } 
    };

  } catch (e: unknown) {
    console.error("AI request failed");
    
    const fallbackConfig: Config = {
      type: "bar",
      title: "Access Events",
      description: "Basic visualization of access event data",
      takeaway: "Data visualization currently unavailable",
      xKey: results[0] ? Object.keys(results[0])[0] || "category" : "category",
      yKeys: results[0] 
        ? [Object.keys(results[0])[1] || "value"]
        : ["value"],
      colors: results[0] 
        ? { [Object.keys(results[0])[1] || "value"]: `hsl(var(--chart-1))` }
        : { value: `hsl(var(--chart-1))` },
      legend: false
    };

    if (e instanceof Error && e.message.includes('tokens')) {
      console.warn('Token limit exceeded, using fallback chart config');
      return { config: fallbackConfig };
    }

    throw new Error("Failed to generate chart suggestion");
  }
};

export const generateTableSummary = async (
  results: Result[],
  userQuery: string,
  sqlQuery: string
): Promise<string> => {
  await requireAccess();
  userQuery = questionSchema.parse(userQuery);
  sqlQuery = sqlInputSchema.parse(sqlQuery);
  resultsSchema.parse(results);
  try {
    const result = await generateText({
      model,
      maxOutputTokens: 1_000,
      abortSignal: AbortSignal.timeout(30_000),
      maxRetries: 1,
      prompt: `As a security access control analyst, provide a concise, informative summary of the access event data based on the user's search intent and the data retrieved.

CONTEXT:
User's Search Query: "${userQuery}"
SQL Query Executed: "${sqlQuery}"

IMPORTANT ACCESS CODE DEFINITIONS:
- granted_full_test_used: Standard successful access (normal operation)
- granted_full: Standard successful access without verification
- denied_full: Access denied (unauthorized attempt)
- denied_schedule: Access denied due to schedule restrictions
- denied_anti_passback: Access denied due to tailgating prevention

DATA ANALYSIS POINTS:
1. Access Patterns: When and where access occurred
2. Credential Usage: Types and frequency of credentials used
3. Success Rate: Patterns in granted vs denied access
4. Time Patterns: Business hours (9AM-5PM) vs after-hours access
5. Location Patterns: Most frequently accessed areas
6. Relevance: How the findings relate to the user's search intent

GUIDELINES:
- "granted_full_test_used" is normal successful access, not a test credential
- Directly address the user's search intent
- Focus on security-relevant patterns and insights
- Use specific numbers and statistics when relevant
- Highlight any unusual or notable patterns
- Keep the summary professional and clear
- Limit to 2-3 concise sentences

DATA TO ANALYZE:
${JSON.stringify(results.slice(0, 50))}

Provide a clear, security-focused summary that addresses the user's search intent:`,
      temperature: 0.2,
    });
    
    return result.text.trim() || "No summary available.";
  } catch (e) {
    console.error("Summary generation failed");
    return "Error generating summary.";
  }
};
