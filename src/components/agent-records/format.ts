import { messages } from "@/lib/messages";

/** Thai date-time in Bangkok, the way every log table here prints one. */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
}

/** Time from `from` to `now`, in minutes and seconds. */
export function formatElapsed(from: string, now: number): string {
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(from).getTime()) / 1000),
  );
  return messages.agentRecords.duration(Math.floor(seconds / 60), seconds % 60);
}
