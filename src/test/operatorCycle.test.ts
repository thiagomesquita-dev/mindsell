import { describe, it, expect } from "vitest";

/**
 * Tests for operator cycle threshold logic.
 * These test the pure business rules that determine when a cycle should close.
 */

const CYCLE_SIZE = 10;

interface AnalysisSummary {
  id: string;
  score: number;
}

function getUncycledAnalyses(
  allAnalyses: AnalysisSummary[],
  closedCycleIds: Set<string>
): AnalysisSummary[] {
  return allAnalyses.filter((a) => !closedCycleIds.has(a.id));
}

function shouldCloseCycle(uncycledCount: number): boolean {
  return uncycledCount >= CYCLE_SIZE;
}

function getCycleAnalyses(uncycled: AnalysisSummary[]): AnalysisSummary[] {
  return uncycled.slice(0, CYCLE_SIZE);
}

function computeNextCycleNumber(previousCycleNumber: number | null): number {
  return previousCycleNumber ? previousCycleNumber + 1 : 1;
}

describe("Operator Cycle Logic", () => {
  it("should NOT close cycle when fewer than 10 analyses", () => {
    expect(shouldCloseCycle(5)).toBe(false);
    expect(shouldCloseCycle(9)).toBe(false);
    expect(shouldCloseCycle(0)).toBe(false);
  });

  it("should close cycle when exactly 10 analyses", () => {
    expect(shouldCloseCycle(10)).toBe(true);
  });

  it("should close cycle when more than 10 analyses", () => {
    expect(shouldCloseCycle(15)).toBe(true);
  });

  it("filters out analyses already in closed cycles", () => {
    const all: AnalysisSummary[] = Array.from({ length: 15 }, (_, i) => ({
      id: `a-${i}`,
      score: 70 + i,
    }));
    const closedIds = new Set(["a-0", "a-1", "a-2", "a-3", "a-4", "a-5", "a-6", "a-7", "a-8", "a-9"]);

    const uncycled = getUncycledAnalyses(all, closedIds);
    expect(uncycled).toHaveLength(5);
    expect(shouldCloseCycle(uncycled.length)).toBe(false);
  });

  it("takes first CYCLE_SIZE analyses for the new cycle", () => {
    const uncycled: AnalysisSummary[] = Array.from({ length: 12 }, (_, i) => ({
      id: `a-${i}`,
      score: 60 + i,
    }));

    const cycleAnalyses = getCycleAnalyses(uncycled);
    expect(cycleAnalyses).toHaveLength(CYCLE_SIZE);
    expect(cycleAnalyses[0].id).toBe("a-0");
    expect(cycleAnalyses[9].id).toBe("a-9");
  });

  it("computes cycle number correctly", () => {
    expect(computeNextCycleNumber(null)).toBe(1);
    expect(computeNextCycleNumber(1)).toBe(2);
    expect(computeNextCycleNumber(5)).toBe(6);
  });

  it("full scenario: 20 analyses → 2 cycles possible", () => {
    const all: AnalysisSummary[] = Array.from({ length: 20 }, (_, i) => ({
      id: `a-${i}`,
      score: 50 + i,
    }));

    // Cycle 1
    const uncycled1 = getUncycledAnalyses(all, new Set());
    expect(shouldCloseCycle(uncycled1.length)).toBe(true);
    const cycle1 = getCycleAnalyses(uncycled1);
    expect(cycle1).toHaveLength(10);

    // After cycle 1 closes
    const closedIds = new Set(cycle1.map((a) => a.id));
    const uncycled2 = getUncycledAnalyses(all, closedIds);
    expect(uncycled2).toHaveLength(10);
    expect(shouldCloseCycle(uncycled2.length)).toBe(true);

    const cycleNumber = computeNextCycleNumber(1);
    expect(cycleNumber).toBe(2);
  });
});
