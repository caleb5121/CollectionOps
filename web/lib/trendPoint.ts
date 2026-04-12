/** Daily (or weekly-aggregated) trend bucket for charts and analytics. */
export type TrendPoint = {
  /** X-axis label: daily "Jun 01" or weekly "Jun 1–7". */
  day: string;
  revenue: number;
  orders: number;
  shipping: number;
  /** Local midnight ms for the bucket start (daily) or week start (weekly). */
  dateMs: number;
};
