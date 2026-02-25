import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/landing/hero-section';
import { IndustryGrid } from '@/components/landing/industry-grid';
import { HowItWorks } from '@/components/landing/how-it-works';
import { FeaturesSection } from '@/components/landing/features-section';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Navbar />
      <main>
        <HeroSection />
        <IndustryGrid />
        <FeaturesSection />
        <HowItWorks />

        {/* CTA Section */}
        <section className="border-b border-neutral-200">
          <div className="mx-auto max-w-[1400px] p-12 md:p-20">
            <div className="text-center">
              <h2 className="font-mono text-4xl font-bold uppercase tracking-tighter text-neutral-900 md:text-6xl">
                READY TO DEPLOY?
              </h2>
              <p className="mx-auto mt-4 max-w-lg font-mono text-sm text-neutral-500">
                Set up your AI agent in minutes. Train it on your business,
                deploy it across every channel, and let it work for you 24/7.
              </p>
              <div className="mt-8">
                <a href="/onboarding/agents">
                  <button className="rounded-none bg-orange-500 px-10 py-4 font-mono text-sm uppercase tracking-wider text-white transition-colors hover:bg-orange-600">
                    GET STARTED
                  </button>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
