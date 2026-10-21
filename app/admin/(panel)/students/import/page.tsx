import Link from "next/link";
import StudentImport from "@/components/StudentImport";
import { managementPage } from "@/lib/admin";

export const maxDuration = 60;

export default async function ImportPage() {
  await managementPage();
  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/students">Students</Link> / Import</p><h1>Import students</h1></div>
      </div>
      <StudentImport />
    </>
  );
}
