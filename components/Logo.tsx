import Image from "next/image";

export default function Logo({ size = 48 }: { size?: number }) {
  return <Image className="logo" src="/logo.png" alt="" width={size} height={size} priority />;
}
