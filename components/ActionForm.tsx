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
  /** Optional second button; when used, the form sends channel=<value>. */
  secondary?: { label: string; value: string };
};

export default function ActionForm({ action, submit, children, className = "aform", resetOnSuccess, variant = "orange", secondary }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const channel = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      {children}
      {state?.error && <div className="err" role="alert">{state.error}</div>}
      {state?.ok && <div className="ok-msg" role="status">{state.ok}</div>}
      {secondary && <input ref={channel} type="hidden" name="channel" defaultValue="" />}
      <div className="form-buttons">
        <button className={`btn btn-${variant} btn-sm`} type="submit" disabled={pending} onClick={() => { if (channel.current) channel.current.value = ""; }}>
          {pending ? "Saving…" : submit}
        </button>
        {secondary && (
          <button className="btn btn-sm btn-sms" type="submit" disabled={pending} onClick={() => { if (channel.current) channel.current.value = secondary.value; }}>
            {pending ? "Sending…" : secondary.label}
          </button>
        )}
      </div>
    </form>
  );
}
