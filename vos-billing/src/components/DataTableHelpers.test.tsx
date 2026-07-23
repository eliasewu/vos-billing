import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  moneyRender,
  actionsRender,
  deleteRender,
  statusToggleRender,
  badgeRender,
} from "@/components/DataTableHelpers";

// ─────────────────────────────────────────────────
// moneyRender
// ─────────────────────────────────────────────────

describe("moneyRender", () => {
  it("renders positive values with emerald color", () => {
    const render = moneyRender<{ amount: number }>((r) => r.amount);
    const html = renderToString(render({ amount: 10.5 }) as any);
    expect(html).toContain("text-emerald-400");
    expect(html).toContain("$10.5000");
    expect(html).not.toContain("text-red-400");
  });

  it("renders negative values with red color and minus sign", () => {
    const render = moneyRender<{ amount: number }>((r) => r.amount);
    const html = renderToString(render({ amount: -5.25 }) as any);
    expect(html).toContain("text-red-400");
    expect(html).toContain("-$5.2500");
  });

  it("renders zero as emerald (non-negative)", () => {
    const render = moneyRender<{ amount: number }>((r) => r.amount);
    const html = renderToString(render({ amount: 0 }) as any);
    expect(html).toContain("text-emerald-400");
    expect(html).toContain("$0.0000");
  });

  it("respects custom digits parameter", () => {
    const render = moneyRender<{ v: number }>((r) => r.v, 2);
    const html = renderToString(render({ v: 99.999 }) as any);
    expect(html).toContain("$100.00");
  });

  it("renders large numbers without scientific notation", () => {
    const render = moneyRender<{ v: number }>((r) => r.v);
    const html = renderToString(render({ v: 1234567.89 }) as any);
    expect(html).toContain("$1234567.8900");
    expect(html).not.toContain("e+");
  });

  it("renders very small fractions correctly", () => {
    const render = moneyRender<{ v: number }>((r) => r.v, 6);
    const html = renderToString(render({ v: 0.000001 }) as any);
    expect(html).toContain("$0.000001");
  });
});

// ─────────────────────────────────────────────────
// actionsRender
// ─────────────────────────────────────────────────

describe("actionsRender", () => {
  it("renders both edit and delete buttons", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const render = actionsRender<{ id: number }>(onEdit, onDelete);
    const html = renderToString(render({ id: 1 }) as any);
    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(2);
  });

  it("calls onEdit with the row when edit button clicked", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const render = actionsRender<{ id: number; name: string }>(onEdit, onDelete);
    const row = { id: 42, name: "Test" };

    const el = render(row) as any;
    const children = el.props.children;
    expect(children).toHaveLength(2);

    children[0].props.onClick();
    expect(onEdit).toHaveBeenCalledWith(row);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onDelete with the row when delete button clicked", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const render = actionsRender<{ id: number }>(onEdit, onDelete);
    const row = { id: 99 };

    const el = render(row) as any;
    const children = el.props.children;

    children[1].props.onClick();
    expect(onDelete).toHaveBeenCalledWith(row);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("works with different row types", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    interface CustomRow { uuid: string; label: string }
    const render = actionsRender<CustomRow>(onEdit, onDelete);
    const row: CustomRow = { uuid: "abc-123", label: "Hello" };

    const el = render(row) as any;
    el.props.children[0].props.onClick();
    expect(onEdit).toHaveBeenCalledWith(row);
  });
});

// ─────────────────────────────────────────────────
// deleteRender
// ─────────────────────────────────────────────────

describe("deleteRender", () => {
  it("renders a single delete button", () => {
    const onDelete = vi.fn();
    const render = deleteRender<{ id: number }>(onDelete);
    const html = renderToString(render({ id: 1 }) as any);
    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(1);
  });

  it("calls onDelete with the row when clicked", () => {
    const onDelete = vi.fn();
    const render = deleteRender<{ id: number }>(onDelete);
    const row = { id: 77 };

    const el = render(row) as any;
    el.props.onClick();
    expect(onDelete).toHaveBeenCalledWith(row);
  });

  it("renders with red hover styling", () => {
    const render = deleteRender<{ id: number }>(vi.fn());
    const html = renderToString(render({ id: 1 }) as any);
    expect(html).toContain("text-red");
  });
});

// ─────────────────────────────────────────────────
// statusToggleRender
// ─────────────────────────────────────────────────

describe("statusToggleRender", () => {
  it("renders active state with emerald styling (default activeValue=0)", () => {
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds: new Set(),
    });
    const html = renderToString(render({ id: 1, status: 0 }) as any);
    expect(html).toContain("text-emerald-400");
    expect(html).toContain("Active");
    expect(html).not.toContain("disabled");
  });

  it("renders inactive state with red styling", () => {
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds: new Set(),
    });
    const html = renderToString(render({ id: 2, status: 1 }) as any);
    expect(html).toContain("text-red-400");
    expect(html).toContain("Status 1");
  });

  it("renders locked state as non-interactive", () => {
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds: new Set(),
      lockedValue: 2,
    });
    const html = renderToString(render({ id: 3, status: 2 }) as any);
    expect(html).toContain("cursor-not-allowed");
    expect(html).toContain("disabled");
    expect(html).toContain("Cannot toggle");
  });

  it("uses custom activeValue", () => {
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds: new Set(),
      activeValue: 1,
    });
    const htmlActive = renderToString(render({ id: 1, status: 1 }) as any);
    expect(htmlActive).toContain("text-emerald-400");

    const htmlInactive = renderToString(render({ id: 2, status: 0 }) as any);
    expect(htmlInactive).toContain("text-red-400");
  });

  it("uses custom labels when provided", () => {
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds: new Set(),
      labels: { 0: "Online", 1: "Offline" },
    });
    const htmlActive = renderToString(render({ id: 1, status: 0 }) as any);
    expect(htmlActive).toContain("Online");

    const htmlInactive = renderToString(render({ id: 2, status: 1 }) as any);
    expect(htmlInactive).toContain("Offline");
  });

  it("uses custom title tooltips", () => {
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds: new Set(),
      titles: { activate: "Turn on", deactivate: "Turn off" },
    });
    const htmlActive = renderToString(render({ id: 1, status: 0 }) as any);
    expect(htmlActive).toContain("Turn off");

    const htmlInactive = renderToString(render({ id: 2, status: 1 }) as any);
    expect(htmlInactive).toContain("Turn on");
  });

  it("shows loading spinner when row is toggling", () => {
    const togglingIds = new Set([1]);
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds,
    });
    const html = renderToString(render({ id: 1, status: 0 }) as any);
    expect(html).toContain("animate-spin");
  });

  it("calls onToggle with correct id and current status", () => {
    const onToggle = vi.fn();
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle,
      togglingIds: new Set(),
    });
    const element = render({ id: 42, status: 1 }) as any;
    element.props.onClick();
    expect(onToggle).toHaveBeenCalledWith(42, 1);
  });

  it("does not call onToggle when locked", () => {
    const onToggle = vi.fn();
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle,
      togglingIds: new Set(),
      lockedValue: 2,
    });
    const element = render({ id: 1, status: 2 }) as any;
    expect(element.props.disabled).toBe(true);
  });

  it("hides dot indicator when showDot is false", () => {
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds: new Set(),
      showDot: false,
    });
    const element = render({ id: 1, status: 0 }) as any;
    const children = React.Children.toArray(element.props.children);
    const hasDotSpan = children.some(
      (child: any) => child?.type === "span" && child?.props?.className?.includes("rounded-full")
    );
    expect(hasDotSpan).toBe(false);
  });

  it("shows dot indicator by default", () => {
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds: new Set(),
    });
    const element = render({ id: 1, status: 0 }) as any;
    const children = React.Children.toArray(element.props.children);
    const hasDotSpan = children.some(
      (child: any) => child?.type === "span" && child?.props?.className?.includes("rounded-full")
    );
    expect(hasDotSpan).toBe(true);
  });

  it("emerald dot for active, red for locked, surface for inactive", () => {
    const render = statusToggleRender({
      getId: (r: { id: number; status: number }) => r.id,
      getStatus: (r: { id: number; status: number }) => r.status,
      onToggle: vi.fn(),
      togglingIds: new Set(),
      lockedValue: 2,
      labels: { 0: "Active", 1: "Inactive", 2: "Locked" },
    });

    const findDot = (el: any) => {
      const children = React.Children.toArray(el.props.children);
      return children.find(
        (c: any) => c?.type === "span" && c?.props?.className?.includes("rounded-full")
      ) as any;
    };

    const activeEl = render({ id: 1, status: 0 }) as any;
    expect(findDot(activeEl)?.props.className).toContain("bg-emerald-400");

    const inactiveEl = render({ id: 2, status: 1 }) as any;
    expect(findDot(inactiveEl)?.props.className).toContain("bg-surface-500");

    const lockedEl = render({ id: 3, status: 2 }) as any;
    expect(findDot(lockedEl)?.props.className).toContain("bg-red-400");
  });
});

// ─────────────────────────────────────────────────
// badgeRender
// ─────────────────────────────────────────────────

describe("badgeRender", () => {
  const LABELS: Record<number, string> = {
    0: "General",
    1: "Clearing",
    2: "Agent",
  };

  it("renders with default colors for known values", () => {
    const render = badgeRender<{ type: number }>((r) => r.type, LABELS);
    const html = renderToString(render({ type: 0 }) as any);
    expect(html).toContain("bg-blue-500/10");
    expect(html).toContain("text-blue-400");
    expect(html).toContain("General");
  });

  it("uses type=1 default amber color", () => {
    const render = badgeRender<{ type: number }>((r) => r.type, LABELS);
    const html = renderToString(render({ type: 1 }) as any);
    expect(html).toContain("bg-amber-500/10");
    expect(html).toContain("Clearing");
  });

  it("uses type=2 default violet color", () => {
    const render = badgeRender<{ type: number }>((r) => r.type, LABELS);
    const html = renderToString(render({ type: 2 }) as any);
    expect(html).toContain("bg-violet-500/10");
    expect(html).toContain("Agent");
  });

  it("uses custom colors when provided", () => {
    const customColors = {
      0: "bg-surface-800 text-surface-400",
      1: "bg-brand-500/10 text-brand-400",
    };
    const render = badgeRender<{ type: number }>((r) => r.type, LABELS, customColors);
    const html0 = renderToString(render({ type: 0 }) as any);
    expect(html0).toContain("bg-surface-800");

    const html1 = renderToString(render({ type: 1 }) as any);
    expect(html1).toContain("bg-brand-500/10");
  });

  it("falls back to surface color for unknown values", () => {
    const render = badgeRender<{ type: number }>((r) => r.type, LABELS);
    const html = renderToString(render({ type: 99 }) as any);
    expect(html).toContain("bg-surface-800");
    expect(html).toContain("text-surface-400");
  });

  it("shows 'Type N' for unknown labels", () => {
    const render = badgeRender<{ type: number }>((r) => r.type, {});
    const html = renderToString(render({ type: 5 }) as any);
    expect(html).toContain("Type 5");
  });

  it("renders with inline-flex and pill styling", () => {
    const render = badgeRender<{ type: number }>((r) => r.type, LABELS);
    const html = renderToString(render({ type: 0 }) as any);
    expect(html).toContain("inline-flex");
    expect(html).toContain("rounded");
    expect(html).toContain("text-xs");
    expect(html).toContain("font-medium");
  });
});
