import { describe, it, expect } from "vitest";

/**
 * Tests for weekly performance window logic.
 */

const MIN_ANALYSES = 3;

interface AnalysisSummary {
  id: string;
  operador: string;
  score: number;
  created_at: string;
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekSunday(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function filterAnalysesByWeek(analyses: AnalysisSummary[], start: Date, end: Date): AnalysisSummary[] {
  return analyses.filter((a) => {
    const d = new Date(a.created_at);
    return d >= start && d <= end;
  });
}

function shouldGenerateReport(count: number): boolean {
  return count >= MIN_ANALYSES;
}

function groupByOperator(analyses: AnalysisSummary[]): Map<string, AnalysisSummary[]> {
  const map = new Map<string, AnalysisSummary[]>();
  for (const a of analyses) {
    const list = map.get(a.operador) || [];
    list.push(a);
    map.set(a.operador, list);
  }
  return map;
}

describe("Weekly Performance Window Logic", () => {
  it("getWeekMonday returns correct Monday for a Wednesday", () => {
    const wed = new Date("2026-03-11T14:00:00Z"); // Wednesday
    const monday = getWeekMonday(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(9);
  });

  it("getWeekMonday returns correct Monday for a Sunday", () => {
    const sun = new Date("2026-03-15T10:00:00Z"); // Sunday
    const monday = getWeekMonday(sun);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(9);
  });

  it("getWeekSunday returns end of week", () => {
    const monday = new Date("2026-03-09T00:00:00");
    const sunday = getWeekSunday(monday);
    expect(sunday.getDate()).toBe(15);
    expect(sunday.getHours()).toBe(23);
  });

  it("should NOT generate report with fewer than 3 analyses", () => {
    expect(shouldGenerateReport(0)).toBe(false);
    expect(shouldGenerateReport(1)).toBe(false);
    expect(shouldGenerateReport(2)).toBe(false);
  });

  it("should generate report with 3 or more analyses", () => {
    expect(shouldGenerateReport(3)).toBe(true);
    expect(shouldGenerateReport(10)).toBe(true);
  });

  it("filters analyses within week window correctly", () => {
    const monday = new Date("2026-03-09T00:00:00Z");
    const sunday = getWeekSunday(monday);

    const analyses: AnalysisSummary[] = [
      { id: "1", operador: "Ana", score: 80, created_at: "2026-03-10T10:00:00Z" },
      { id: "2", operador: "Ana", score: 70, created_at: "2026-03-12T10:00:00Z" },
      { id: "3", operador: "Ana", score: 90, created_at: "2026-03-08T10:00:00Z" }, // previous week
      { id: "4", operador: "Ana", score: 75, created_at: "2026-03-16T10:00:00Z" }, // next week
    ];

    const filtered = filterAnalysesByWeek(analyses, monday, sunday);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((a) => a.id)).toEqual(["1", "2"]);
  });

  it("groups analyses by operator", () => {
    const analyses: AnalysisSummary[] = [
      { id: "1", operador: "Ana", score: 80, created_at: "2026-03-10T10:00:00Z" },
      { id: "2", operador: "João", score: 70, created_at: "2026-03-10T10:00:00Z" },
      { id: "3", operador: "Ana", score: 90, created_at: "2026-03-11T10:00:00Z" },
      { id: "4", operador: "Ana", score: 75, created_at: "2026-03-12T10:00:00Z" },
      { id: "5", operador: "João", score: 65, created_at: "2026-03-12T10:00:00Z" },
    ];

    const grouped = groupByOperator(analyses);
    expect(grouped.get("Ana")?.length).toBe(3);
    expect(grouped.get("João")?.length).toBe(2);
    expect(shouldGenerateReport(grouped.get("Ana")!.length)).toBe(true);
    expect(shouldGenerateReport(grouped.get("João")!.length)).toBe(false);
  });

  it("full scenario: week with multiple operators, mixed eligibility", () => {
    const monday = new Date("2026-03-09T00:00:00Z");
    const sunday = getWeekSunday(monday);

    const analyses: AnalysisSummary[] = [
      { id: "1", operador: "Ana", score: 80, created_at: "2026-03-09T08:00:00Z" },
      { id: "2", operador: "Ana", score: 75, created_at: "2026-03-10T10:00:00Z" },
      { id: "3", operador: "Ana", score: 85, created_at: "2026-03-11T14:00:00Z" },
      { id: "4", operador: "Ana", score: 90, created_at: "2026-03-12T09:00:00Z" },
      { id: "5", operador: "João", score: 60, created_at: "2026-03-10T10:00:00Z" },
      { id: "6", operador: "João", score: 65, created_at: "2026-03-13T10:00:00Z" },
    ];

    const weekAnalyses = filterAnalysesByWeek(analyses, monday, sunday);
    expect(weekAnalyses).toHaveLength(6);

    const grouped = groupByOperator(weekAnalyses);

    // Ana: 4 analyses → eligible
    expect(shouldGenerateReport(grouped.get("Ana")!.length)).toBe(true);
    // João: 2 analyses → not eligible
    expect(shouldGenerateReport(grouped.get("João")!.length)).toBe(false);
  });
});
