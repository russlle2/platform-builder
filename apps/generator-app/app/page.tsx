// Homepage with revamped messaging
import { Hero } from '@/components/Hero';
import { WhyDifferent } from '@/components/WhyDifferent';
import { BuiltForBusinesses } from '@/components/BuiltForBusinesses';
import { CheckoutTimeline } from '@/components/CheckoutTimeline';
import { ProofSection } from '@/components/ProofSection';
import { FinalCTA } from '@/components/FinalCTA';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <WhyDifferent />
      <BuiltForBusinesses />
      <CheckoutTimeline />
      <ProofSection />
      <FinalCTA />
    </main>
  );
}
