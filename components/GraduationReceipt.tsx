import SchoolReceipt from "@/components/SchoolReceipt";

export default function GraduationReceipt({ name, studentNo, paidOn, amount }: { name: string; studentNo: string; paidOn: string; amount: number }) {
  return <SchoolReceipt title="GRADUATION RECEIPT" date={paidOn} name={name} studentNo={studentNo} amount={amount} respectOf="Graduation fee" />;
}
