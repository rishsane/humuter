export const INDUSTRIES = [
  {
    id: 'blockchain',
    name: 'Blockchain',
    description: 'Web3 protocols, DeFi, NFTs, DAOs',
    icon: 'Blocks',
    available: true,
  },
  {
    id: 'ai',
    name: 'AI',
    description: 'AI products, ML platforms, LLM tools',
    icon: 'Brain',
    available: false,
  },
  {
    id: 'food',
    name: 'Food',
    description: 'Restaurants, delivery, F&B brands',
    icon: 'UtensilsCrossed',
    available: false,
  },
  {
    id: 'fintech',
    name: 'Fintech',
    description: 'Banking, payments, insurance',
    icon: 'Landmark',
    available: false,
  },
] as const;

export type IndustryId = (typeof INDUSTRIES)[number]['id'];
