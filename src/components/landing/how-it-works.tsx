export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Choose Agent',
      description: 'Select from Community Manager, KOL, Customer Service, Protocol Onboarding, or define your own.',
    },
    {
      number: '02',
      title: 'Pay & Train',
      description: 'Pick a plan, pay with USDC on Base. Answer questions to train the agent on your project.',
    },
    {
      number: '03',
      title: 'Deploy',
      description: 'Get your API key and deploy across Telegram, Discord, your website, and any channel.',
    },
    {
      number: '04',
      title: 'Manage',
      description: 'Monitor analytics, manage channels, retrain, and scale your agent from the dashboard.',
    },
  ];

  return (
    <section id="how-it-works" className="border-b border-neutral-200">
      <div className="mx-auto max-w-[1400px]">
        {/* Section header */}
        <div className="border-b border-neutral-200 p-8 md:p-12">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-neutral-900" />
            <span className="font-mono text-lg font-bold text-neutral-900">
              How It Works
            </span>
          </div>
          <p className="mt-2 font-mono text-sm text-neutral-500">
            From zero to deployed in four steps
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative border-r border-b border-neutral-200 p-8 transition-colors hover:bg-neutral-50 last:border-r-0"
            >
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 h-4 w-4 border-t border-l border-neutral-200" />
              <div className="absolute top-3 right-3 h-4 w-4 border-t border-r border-neutral-200" />

              <div className="flex items-center justify-between">
                <div className="h-2 w-2 bg-orange-500" />
                <span className="font-mono text-xs text-neutral-300">{step.number}</span>
              </div>

              <h3 className="mt-8 font-mono text-base font-bold text-neutral-900">
                {step.title}
              </h3>
              <p className="mt-3 font-mono text-xs leading-relaxed text-neutral-500">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
