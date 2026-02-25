export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export interface OnboardingState {
  currentStep: OnboardingStep;
  industry: string | null;
  agentType: string | null;
  customAgentDescription: string;
  plan: 'starter' | 'pro' | 'enterprise' | null;
  paymentStatus: 'pending' | 'processing' | 'confirmed' | 'failed';
  txHash: string | null;
  walletAddress: string | null;
  trainingData: Record<string, string>;
  skillFileUrl: string | null;
  agentId: string | null;
  apiKey: string | null;
}
