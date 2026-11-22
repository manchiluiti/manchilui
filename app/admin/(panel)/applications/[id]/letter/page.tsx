import { notFound } from "next/navigation";
import AcceptanceLetter from "@/components/AcceptanceLetter";
import { managementPage } from "@/lib/admin";

export default async function Letter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await managementPage();
  const [{ data: a }, { data: st }] = await Promise.all([
    supabase.from("applications").select("*").eq("id", id).maybeSingle(),
    supabase.from("app_settings").select("graduation_fee").maybeSingle(),
  ]);
  if (!a || !(a.status === "Accepted" || a.status === "Registered")) notFound();
  return (
    <AcceptanceLetter
      name={a.full_name}
      town={a.town}
      phone={a.phone}
      letterDate={a.reviewed_at ?? new Date().toISOString()}
      startDate={a.start_date}
      tuition={Number(a.fees_offered ?? 0)}
      graduationFee={Number(st?.graduation_fee ?? 800)}
      note={a.decision_note}
    />
  );
}
