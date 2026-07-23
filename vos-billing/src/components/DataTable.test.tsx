import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import DataTable from "@/components/DataTable";

// Minimal row type for testing
interface TestRow {
  id: number;
  name: string;
}

const DEFAULT_COLUMNS: Parameters<typeof DataTable<TestRow>>[0]["columns"] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
];

describe("DataTable emptySubtitle", () => {
  it("renders emptySubtitle when provided", () => {
    const html = renderToString(
      <DataTable<TestRow>
        columns={DEFAULT_COLUMNS}
        data={[]}
        emptyMessage="No records found"
        emptySubtitle="Try adjusting your filters"
      />
    );
    expect(html).toContain("Try adjusting your filters");
    // Verify it renders as a muted paragraph element
    expect(html).toContain("text-surface-600");
    expect(html).toContain("mt-1");
  });

  it("does NOT render emptySubtitle when omitted", () => {
    const html = renderToString(
      <DataTable<TestRow>
        columns={DEFAULT_COLUMNS}
        data={[]}
        emptyMessage="No records found"
      />
    );
    expect(html).toContain("No records found");
    // The subtitle paragraph with text-surface-600 should not be present
    // (the emptyMessage itself uses text-surface-500)
    expect(html).not.toMatch(/<p[^>]*class="[^"]*text-surface-600[^"]*"[^>]*>/);
  });

  it("does NOT render emptySubtitle when it's an empty string", () => {
    const html = renderToString(
      <DataTable<TestRow>
        columns={DEFAULT_COLUMNS}
        data={[]}
        emptyMessage="No records found"
        emptySubtitle=""
      />
    );
    expect(html).toContain("No records found");
    // Empty string should be falsy, so no subtitle p should render
    const subtitleMatches = (html.match(/text-surface-600/g) || []).length;
    expect(subtitleMatches).toBe(0);
  });

  it("renders emptySubtitle below emptyMessage in DOM order", () => {
    const html = renderToString(
      <DataTable<TestRow>
        columns={DEFAULT_COLUMNS}
        data={[]}
        emptyMessage="No records found"
        emptySubtitle="Try adjusting your filters"
      />
    );
    const messageIndex = html.indexOf("No records found");
    const subtitleIndex = html.indexOf("Try adjusting your filters");
    expect(messageIndex).toBeGreaterThan(0);
    expect(subtitleIndex).toBeGreaterThan(messageIndex);
  });

  it("emptySubtitle works with a custom emptyIcon", () => {
    const html = renderToString(
      <DataTable<TestRow>
        columns={DEFAULT_COLUMNS}
        data={[]}
        emptyMessage="Nothing here"
        emptyIcon={<span className="custom-icon">🔍</span>}
        emptySubtitle="Add some data to get started"
      />
    );
    expect(html).toContain("custom-icon");
    expect(html).toContain("Nothing here");
    expect(html).toContain("Add some data to get started");
  });

  it("emptySubtitle does not appear when data is non-empty", () => {
    const html = renderToString(
      <DataTable<TestRow>
        columns={DEFAULT_COLUMNS}
        data={[{ id: 1, name: "Alice" }]}
        emptyMessage="No records found"
        emptySubtitle="Try adjusting your filters"
      />
    );
    expect(html).toContain("Alice");
    expect(html).not.toContain("Try adjusting your filters");
    expect(html).not.toContain("No records found");
  });

  it("emptySubtitle does not appear during loading state", () => {
    const html = renderToString(
      <DataTable<TestRow>
        columns={DEFAULT_COLUMNS}
        data={[{ id: 1, name: "Bob" }]}
        loading={true}
        emptyMessage="No records found"
        emptySubtitle="Try adjusting your filters"
      />
    );
    expect(html).toContain("animate-pulse");
    expect(html).not.toContain("Try adjusting your filters");
    expect(html).not.toContain("No records found");
  });
});
