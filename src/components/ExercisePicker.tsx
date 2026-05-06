"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PickerExercise = {
  id: string;
  name: string;
  muscle_group: string | null;
};

export function ExercisePicker({
  exercises,
  selectedId,
  query,
  onSelect,
  onQueryChange,
  inputId = "exercise-search",
  listboxId = "exercise-listbox",
  label = "Exercise",
}: {
  exercises: PickerExercise[];
  selectedId: string;
  query: string;
  onSelect: (id: string) => void;
  onQueryChange: (q: string) => void;
  inputId?: string;
  listboxId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.muscle_group?.toLowerCase().includes(q) ?? false)
    );
  }, [query, exercises]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      itemRefs.current[highlight]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlight, open]);

  function pick(ex: PickerExercise) {
    onSelect(ex.id);
    onQueryChange(ex.name);
    setOpen(false);
  }

  function clear() {
    onSelect("");
    onQueryChange("");
    setHighlight(0);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        e.preventDefault();
        pick(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
      >
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            if (selectedId) onSelect("");
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search exercises..."
          autoComplete="off"
          className="block h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 pr-10 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/50"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-zinc-500">No matches</p>
          ) : (
            filtered.map((ex, i) => (
              <button
                key={ex.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="option"
                aria-selected={ex.id === selectedId}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(ex)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                  i === highlight
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <span className="truncate">{ex.name}</span>
                {ex.muscle_group && (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
                    {ex.muscle_group}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
