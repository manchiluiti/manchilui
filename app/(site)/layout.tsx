import FloatingButtons from "@/components/FloatingButtons";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <SiteFooter />
      <FloatingButtons />
    </>
  );
}
