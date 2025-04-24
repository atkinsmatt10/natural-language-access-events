import { z } from "zod";

// Existing types
export type Unicorn = {
  id: number;
  company: string;
  valuation: number;
  date_joined: Date | null;
  country: string;
  city: string;
  industry: string;
  select_investors: string;
};

// New Access Control types
export type AccessEvent = {
  id: number;
  door_name: string;
  controller_name: string;
  first_name: string;
  last_name: string;
  full_name: string;
  local_timestamp: Date;
  code: AccessCode;
  credential_type: CredentialType;
};

// Access Control specific enums
export enum CredentialType {
  Card = "card",
  Mobile = "mobile",
  Pin = "pin",
  Biometric = "biometric"
}

export enum AccessCode {
  GrantedFullTestUsed = "granted_full_test_used",
  DeniedCredentialExpired = "denied_credential_expired",
  DeniedInvalidSchedule = "denied_invalid_schedule",
  DeniedInvalidCredential = "denied_invalid_credential"
}

// Common types
export type Result = Record<string, string | number>;

export const explanationSchema = z.object({
  section: z.string(),
  explanation: z.string(),
});
export const explanationsSchema = z.array(explanationSchema);

export type QueryExplanation = z.infer<typeof explanationSchema>;

// Access Control specific schemas
export const accessEventSchema = z.object({
  id: z.number(),
  door_name: z.string(),
  controller_name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  local_timestamp: z.date(),
  code: z.nativeEnum(AccessCode),
  credential_type: z.nativeEnum(CredentialType)
});

// Chart configuration schemas
export const configSchema = z
  .object({
    description: z
      .string()
      .describe(
        "Describe the chart. What is it showing? What is interesting about the way the data is displayed?",
      ),
    takeaway: z.string().describe("What is the main takeaway from the chart?"),
    type: z.enum(["bar", "line", "area", "pie"]).describe("Type of chart"),
    title: z.string(),
    xKey: z.string().describe("Key for x-axis or category"),
    yKeys: z.array(z.string()).describe("Key(s) for y-axis values this is typically the quantitative column"),
    multipleLines: z.boolean().describe("For line charts only: whether the chart is comparing groups of data.").optional(),
    measurementColumn: z.string().describe("For line charts only: key for quantitative y-axis column to measure against (eg. values, counts etc.)").optional(),
    lineCategories: z.array(z.string()).describe("For line charts only: Categories used to compare different lines or data series. Each category represents a distinct line in the chart.").optional(),
    colors: z
      .record(
        z.string().describe("Any of the yKeys"),
        z.string().describe("Color value in CSS format (e.g., hex, rgb, hsl)"),
      )
      .describe("Mapping of data keys to color values for chart elements")
      .optional(),
    legend: z.boolean().describe("Whether to show legend"),
  })
  .describe("Chart configuration object");

// Access Control specific chart configurations
export const accessChartTypes = {
  ACCESS_OVER_TIME: "access_over_time",
  CREDENTIAL_DISTRIBUTION: "credential_distribution",
  ACCESS_BY_DOOR: "access_by_door",
  HOURLY_ACTIVITY: "hourly_activity",
  SUCCESS_RATE: "success_rate"
} as const;

export type AccessChartType = typeof accessChartTypes[keyof typeof accessChartTypes];

export const accessChartSchema = configSchema.extend({
  chartType: z.nativeEnum(accessChartTypes),
  timeUnit: z.enum(["hour", "day", "week", "month", "year"]).optional(),
  showDenied: z.boolean().optional(),
  groupBy: z.enum(["door", "credential", "controller"]).optional(),
});

export type Config = z.infer<typeof configSchema>;
export type AccessChartConfig = z.infer<typeof accessChartSchema>;

// Helper types for access control specific operations
export type AccessMetrics = {
  totalAccess: number;
  successRate: number;
  deniedCount: number;
  uniqueUsers: number;
};

export type TimeRange = {
  start: Date;
  end: Date;
};

export type DoorActivity = {
  doorName: string;
  accessCount: number;
  successRate: number;
  peakHours: number[];
};

export type CredentialUsage = {
  type: CredentialType;
  count: number;
  percentage: number;
};