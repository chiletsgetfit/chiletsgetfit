"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { nudgeClient, type NudgeState } from "./actions";

const initial: NudgeState = {};

export function NudgeForm({ clientId }: { clientId: string }) {
  const [state, formAction] = useActionState<NudgeState, FormData>(
    nudgeClient,
    initial
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      const t = setTimeout(() => setOpen(false), 1500);
      return () => clearTimeout(t);
    }
  }, [state.success]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        Nudge
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="clientId" value={clientId} />
      <input
        name="message"
        type="text"
        placeholder="Time to train. (default)"
        className="block h-9 flex-1 rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-gold-500"
      />
      <div className="flex items-center gap-2">
        <Submit />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
      {state.error && (
        <p className="text-xs text-red-300 sm:basis-full">{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs text-emerald-300 sm:basis-full">
          {state.success}
        </p>
      )}
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-700 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100 transition-colors hover:border-gold-400 hover:text-gold-400 disabled:opacity-60"
    >
      {pending ? "Sending..." : "Send"}
    </button>
  );
}
