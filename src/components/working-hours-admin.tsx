"use client";

import { useState } from "react";
import { Alert, Button, Card, Checkbox, Input, TimePicker, message } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { replaceHolidayCalendar } from "@/lib/api/client-roles";
import type { HolidayCalendarRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";

/** Minutes from midnight ⇄ a picker value, which wants a full instant. */
function toTime(minute: number): Dayjs {
  return dayjs().startOf("day").add(minute, "minute");
}

function toMinute(value: Dayjs | null): number | null {
  return value ? value.hour() * 60 + value.minute() : null;
}

/**
 * SUP-01 — the company's working window, holidays, and working days.
 *
 * Every field here has existed since the foundation migration and none of it
 * had a screen: `PUT /admin/holiday-calendars/:companyId` was reachable only
 * by hand. Until 31 Aug 2026 nothing read the values either, so the SLA clock
 * counted elapsed time whatever they said — this screen and
 * `business-hours.ts` land together, and one without the other would still be
 * a setting that changes nothing.
 *
 * Saved whole rather than field by field: a holiday removed from the list has
 * to disappear, which a merge cannot express.
 */
export function WorkingHoursAdmin({
  companyId,
  companyName,
  initial,
}: {
  readonly companyId: string;
  readonly companyName: string;
  /** Null for a company that has never had one — the defaults are shown. */
  readonly initial: HolidayCalendarRow | null;
}) {
  const [start, setStart] = useState<Dayjs | null>(
    toTime(initial?.workdayStartMinute ?? 510),
  );
  const [end, setEnd] = useState<Dayjs | null>(
    toTime(initial?.workdayEndMinute ?? 1050),
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    initial?.workingWeekdays ?? [1, 2, 3, 4, 5],
  );
  const [holidays, setHolidays] = useState(
    (initial?.holidays ?? []).join("\n"),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const startMinute = toMinute(start);
    const endMinute = toMinute(end);

    if (startMinute === null || endMinute === null) return;

    // Checked here as well as on the server: an inverted window would give
    // every request a deadline in the past, and saying so on the field is
    // faster than a round trip that answers 422.
    if (endMinute <= startMinute) {
      setError(messages.slaAdmin.endBeforeStart);
      return;
    }

    setBusy(true);
    setError(null);

    const result = await replaceHolidayCalendar(companyId, {
      workday_start_minute: startMinute,
      workday_end_minute: endMinute,
      working_weekdays: [...weekdays].sort((a, b) => a - b),
      holidays: holidays
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });

    setBusy(false);

    if (result.ok) void message.success(messages.slaAdmin.saved);
    else setError(result.message);
  }

  return (
    <Card
      title={`${messages.slaAdmin.company}: ${companyName}`}
      extra={
        <Button type="primary" loading={busy} onClick={() => void save()}>
          {messages.slaAdmin.save}
        </Button>
      }
    >
      <div className="space-y-4">
        {error && <Alert type="error" showIcon title={error} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Text strong>{messages.slaAdmin.start}</Text>
            <TimePicker
              className="mt-1 w-full"
              format="HH:mm"
              minuteStep={15}
              value={start}
              onChange={setStart}
              allowClear={false}
            />
          </label>

          <label className="block">
            <Text strong>{messages.slaAdmin.end}</Text>
            <TimePicker
              className="mt-1 w-full"
              format="HH:mm"
              minuteStep={15}
              value={end}
              onChange={setEnd}
              allowClear={false}
            />
          </label>
        </div>

        <div>
          <Text strong>{messages.slaAdmin.weekdays}</Text>
          <div className="mt-1 flex flex-wrap gap-3">
            {messages.slaAdmin.days.map((label, index) => {
              // ISO weekday: 1 = Monday, matching `workingWeekdays`.
              const day = index + 1;

              return (
                <Checkbox
                  key={day}
                  checked={weekdays.includes(day)}
                  onChange={(event) =>
                    setWeekdays((current) =>
                      event.target.checked
                        ? [...current, day]
                        : current.filter((entry) => entry !== day),
                    )
                  }
                >
                  {label}
                </Checkbox>
              );
            })}
          </div>
        </div>

        <label className="block">
          <Text strong>{messages.slaAdmin.holidays}</Text>
          <Input.TextArea
            className="mt-1"
            rows={6}
            value={holidays}
            onChange={(event) => setHolidays(event.target.value)}
            placeholder="2026-01-01"
          />
          <Paragraph type="secondary" className="mt-1! mb-0! text-xs">
            {messages.slaAdmin.holidaysHint}
          </Paragraph>
        </label>
      </div>
    </Card>
  );
}
