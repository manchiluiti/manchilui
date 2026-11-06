/** Suggestions for intake/session inputs (use list="intake-list"). */
export default function IntakeList({ intakes }: { intakes: string[] }) {
  return (
    <datalist id="intake-list">
      {intakes.map((i) => <option key={i} value={i} />)}
    </datalist>
  );
}
