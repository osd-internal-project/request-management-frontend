/**
 * SUP-01 — the working calendar every business-hours SLA is measured against.
 *
 * Database: holiday_calendars
 * Services: core-service
 */

import { apiGet, type ApiResult } from "../core";
import type { HolidayCalendarRow } from "../types";

/** One row per company that has one; a company with none uses the defaults. */
export async function getHolidayCalendars(): Promise<
  ApiResult<HolidayCalendarRow[]>
> {
  return apiGet<HolidayCalendarRow[]>("/admin/holiday-calendars");
}

const slaApi = { getHolidayCalendars };

export default slaApi;
