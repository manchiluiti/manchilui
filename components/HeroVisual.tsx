import Image from "next/image";

export default function HeroVisual() {
  return (
    <div className="hero-visual anim-r">
      <Image src="/hero.jpg" alt="Containers, trucks and cranes at a cargo port" fill sizes="(max-width: 860px) 100vw, 50vw" priority />
    </div>
  );
}
