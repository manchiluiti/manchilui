"use client";
import { useTransition } from "react";

/** One click plus a browser confirmation; shows the server's error, if any. */
export default function ConfirmDeleteButton({ action, confirmText, label }: { action: () => Promise<{ error?: string } | void>; confirmText: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm btn-danger"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (r && r.error) window.alert(r.error);
        });
      }}
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}
