export type GradeBand = { letter: string; min_mark: number; remark: string; is_pass: boolean };

/** Highest band whose minimum the mark reaches. Scale is read from the grade_scale table. */
export function gradeFor(mark: number | string | null | undefined, scale: GradeBand[]) {
  if (mark === null || mark === undefined || mark === "") return null;
  const m = Number(mark);
  return [...scale].sort((a, b) => Number(b.min_mark) - Number(a.min_mark)).find((g) => m >= Number(g.min_mark)) ?? null;
}
