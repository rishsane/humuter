export interface Question {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'select';
  placeholder?: string;
  options?: string[];
  required: boolean;
}

export const BASE_QUESTIONS: Question[] = [
  { id: 'project_name', label: 'Project Name', type: 'text', placeholder: 'e.g. Uniswap', required: true },
  { id: 'project_description', label: 'What does your project do? (2-3 sentences)', type: 'textarea', placeholder: 'Describe your project...', required: true },
  { id: 'website_url', label: 'Website URL', type: 'url', placeholder: 'https://yourproject.com', required: false },
  { id: 'target_audience', label: 'Who is your target audience?', type: 'textarea', placeholder: 'DeFi users, NFT collectors, developers...', required: true },
  { id: 'tone', label: 'Communication Tone', type: 'select', options: ['Professional', 'Casual & Friendly', 'Technical', 'Degen / Crypto-native', 'Educational'], required: true },
  { id: 'key_topics', label: 'Key topics the agent should know about (comma-separated)', type: 'textarea', placeholder: 'tokenomics, staking, governance, liquidity...', required: true },
  { id: 'avoid_topics', label: 'Topics or phrases to avoid', type: 'textarea', placeholder: 'Price predictions, financial advice...', required: false },
];

export const TYPE_SPECIFIC_QUESTIONS: Record<string, Question[]> = {
  community_manager: [
    { id: 'community_rules', label: 'Community rules and guidelines', type: 'textarea', placeholder: 'No spam, be respectful...', required: true },
    { id: 'faq_items', label: 'Top 5-10 frequently asked questions + answers', type: 'textarea', placeholder: 'Q: How do I stake?\nA: Go to app.yourproject.com...', required: true },
    { id: 'escalation_contact', label: 'Who should the agent escalate to? (name/handle)', type: 'text', placeholder: '@admin_handle', required: false },
    { id: 'welcome_message', label: 'Welcome message for new members', type: 'textarea', placeholder: 'Welcome to our community!...', required: false },
  ],
  kol: [
    { id: 'key_narratives', label: 'Key narratives/talking points for the project', type: 'textarea', placeholder: 'Our unique value proposition is...', required: true },
    { id: 'competitors', label: 'Main competitors and how you differ', type: 'textarea', placeholder: 'Unlike CompetitorX, we...', required: true },
    { id: 'recent_milestones', label: 'Recent milestones or achievements', type: 'textarea', placeholder: 'Launched v2, 100k users...', required: false },
    { id: 'content_style', label: 'Example tweets or posts that match your desired style', type: 'textarea', placeholder: 'Paste example content...', required: false },
  ],
  customer_service: [
    { id: 'common_issues', label: 'Most common user issues and their solutions', type: 'textarea', placeholder: 'Issue: Transaction stuck\nSolution: Clear cache and retry...', required: true },
    { id: 'docs_url', label: 'Link to documentation', type: 'url', placeholder: 'https://docs.yourproject.com', required: false },
    { id: 'support_hours', label: 'What timezone/hours does your human team operate?', type: 'text', placeholder: 'UTC 9AM-5PM', required: false },
    { id: 'escalation_criteria', label: 'When should the agent escalate to a human?', type: 'textarea', placeholder: 'When user reports lost funds...', required: true },
  ],
  protocol_onboarding: [
    { id: 'getting_started_steps', label: 'Step-by-step getting started guide', type: 'textarea', placeholder: '1. Connect wallet\n2. Get tokens\n3. Start using...', required: true },
    { id: 'supported_wallets', label: 'Supported wallets', type: 'text', placeholder: 'MetaMask, Coinbase Wallet, Rainbow...', required: true },
    { id: 'supported_chains', label: 'Supported chains/networks', type: 'text', placeholder: 'Ethereum, Base, Arbitrum...', required: true },
    { id: 'common_errors', label: 'Common errors users encounter and fixes', type: 'textarea', placeholder: 'Error: Insufficient gas\nFix: Add ETH for gas fees...', required: false },
  ],
  other: [
    { id: 'custom_role', label: 'Describe the role this agent should play', type: 'textarea', placeholder: 'This agent should act as...', required: true },
    { id: 'custom_instructions', label: 'Specific instructions for the agent', type: 'textarea', placeholder: 'Always respond in...', required: true },
    { id: 'example_interactions', label: 'Example conversations (how should the agent respond?)', type: 'textarea', placeholder: 'User: How does X work?\nAgent: X works by...', required: false },
  ],
};
