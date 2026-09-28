import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMultiSelect } from "./useMultiSelect";

describe("useMultiSelect", () => {
  it("starts empty by default", () => {
    const { result } = renderHook(() => useMultiSelect());
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectedCount).toBe(0);
  });

  it("seeds from initial ids", () => {
    const { result } = renderHook(() => useMultiSelect(["a", "b"]));
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected("a")).toBe(true);
  });

  it("toggles a single id on and off", () => {
    const { result } = renderHook(() => useMultiSelect());
    act(() => result.current.toggle("x"));
    expect(result.current.isSelected("x")).toBe(true);
    act(() => result.current.toggle("x"));
    expect(result.current.isSelected("x")).toBe(false);
  });

  it("select/deselect are idempotent", () => {
    const { result } = renderHook(() => useMultiSelect());
    act(() => result.current.select("x"));
    act(() => result.current.select("x"));
    expect(result.current.selectedCount).toBe(1);
    act(() => result.current.deselect("x"));
    act(() => result.current.deselect("x"));
    expect(result.current.selectedCount).toBe(0);
  });

  it("selectAll unions with existing selection", () => {
    const { result } = renderHook(() => useMultiSelect(["a"]));
    act(() => result.current.selectAll(["a", "b", "c"]));
    expect(result.current.selectedIds.sort()).toEqual(["a", "b", "c"]);
  });

  it("clear removes everything", () => {
    const { result } = renderHook(() => useMultiSelect(["a", "b"]));
    act(() => result.current.clear());
    expect(result.current.selectedCount).toBe(0);
  });

  it("isAllSelected reflects full coverage of the provided list", () => {
    const { result } = renderHook(() => useMultiSelect());
    expect(result.current.isAllSelected([])).toBe(false);
    act(() => result.current.selectAll(["a", "b"]));
    expect(result.current.isAllSelected(["a", "b"])).toBe(true);
    expect(result.current.isAllSelected(["a", "b", "c"])).toBe(false);
  });
});
