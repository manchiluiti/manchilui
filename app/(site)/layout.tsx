import Masthead from "@/components/Masthead";
import NavBar from "@/components/NavBar";
import SiteFooter from "@/components/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Masthead />
      <div className="stripe" />
      <NavBar />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
