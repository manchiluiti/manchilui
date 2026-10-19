import { type GradeBand } from "@/lib/grades";

export default function GradeBadge({ grade }: { grade: GradeBand | null }) {
  if (!grade) return <span className="grade none">–</span>;
  return <span className={`grade ${grade.is_pass ? "pass" : "fail"}`} title={grade.remark}>{grade.letter}</span>;
}
