import { SiteNav } from "@/components/nav/SiteNav";
import { Hero } from "@/components/hero/Hero";
import { WorkflowSection } from "@/components/workflow/WorkflowSection";
import { DemoSection } from "@/components/demo/DemoSection";
import { DataSection } from "@/components/data/DataSection";
import { ArchitectureSection } from "@/components/architecture/ArchitectureSection";
import { ResearchConsiderations } from "@/components/research/ResearchConsiderations";
import { ClosingSection } from "@/components/closing/ClosingSection";
import { SiteFooter } from "@/components/footer/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <WorkflowSection />
        <DemoSection />
        <DataSection />
        <ArchitectureSection />
        <ResearchConsiderations />
        <ClosingSection />
      </main>
      <SiteFooter />
    </>
  );
}
