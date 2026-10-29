"use client";
import { useTransition } from "react";

/** One click plus a confirmation; deletes the student, their marks, payments, messages and portal login. */
export default function DeleteStudentButton({ action, name, studentNo }: { action: () => Promise<{ error?: string } | void>; name: string; studentNo: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm btn-danger"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete ${name} (${studentNo})?\n\nThis permanently removes their record, results, payments, messages and portal login. It can't be undone.`)) return;
        start(async () => {
          const r = await action();
          if (r && r.error) window.alert(r.error);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete student"}
    </button>
  );
}
