"use client";
import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/admin/actions";

type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submit: string;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  variant?: "orange" | "navy";
};

export default function ActionForm({ action, submit, children, className = "aform", resetOnSuccess, variant = "orange" }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      {children}
      {state?.error && <div className="err" role="alert">{state.error}</div>}
      {state?.ok && <div className="ok-msg" role="status">{state.ok}</div>}
      <div><button className={`btn btn-${variant} btn-sm`} type="submit" disabled={pending}>{pending ? "Saving…" : submit}</button></div>
    </form>
  );
}
