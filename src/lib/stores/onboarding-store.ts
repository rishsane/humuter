import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BillingCycle } from '@/lib/constants/pricing';

interface OnboardingState {
  currentStep: number;
  industry: string | null;
  agentType: string | null;
  customAgentDescription: string;
  plan: 'starter' | 'pro' | 'enterprise' | null;
  billingCycle: BillingCycle;
  paymentStatus: 'pending' | 'processing' | 'confirmed' | 'failed';
  paymentMethod: 'direct' | 'x402' | null;
  txHash: string | null;
  walletAddress: string | null;
  trainingData: Record<string, string>;
  skillFileUrl: string | null;
  agentId: string | null;
  apiKey: string | null;
}

interface OnboardingActions {
  setIndustry: (industry: string) => void;
  setAgentType: (type: string) => void;
  setCustomAgentDescription: (description: string) => void;
  setPlan: (plan: 'starter' | 'pro' | 'enterprise') => void;
  setBillingCycle: (cycle: BillingCycle) => void;
  setPaymentProcessing: () => void;
  setPaymentConfirmed: (txHash: string, wallet: string, method?: 'direct' | 'x402') => void;
  setPaymentFailed: () => void;
  setTrainingAnswer: (questionId: string, answer: string) => void;
  setSkillFileUrl: (url: string | null) => void;
  setDeployment: (agentId: string, apiKey: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
}

const initialState: OnboardingState = {
  currentStep: 1,
  industry: null,
  agentType: null,
  customAgentDescription: '',
  plan: null,
  billingCycle: 'monthly',
  paymentStatus: 'pending',
  paymentMethod: null,
  txHash: null,
  walletAddress: null,
  trainingData: {},
  skillFileUrl: null,
  agentId: null,
  apiKey: null,
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      ...initialState,

      setIndustry: (industry) => set({ industry }),
      setAgentType: (type) => set({ agentType: type }),
      setCustomAgentDescription: (description) => set({ customAgentDescription: description }),
      setPlan: (plan) => set({ plan }),
      setBillingCycle: (cycle) => set({ billingCycle: cycle }),
      setPaymentProcessing: () => set({ paymentStatus: 'processing' }),
      setPaymentConfirmed: (txHash, wallet, method = 'direct') =>
        set({ paymentStatus: 'confirmed', txHash, walletAddress: wallet, paymentMethod: method }),
      setPaymentFailed: () => set({ paymentStatus: 'failed' }),
      setTrainingAnswer: (questionId, answer) =>
        set((state) => ({
          trainingData: { ...state.trainingData, [questionId]: answer },
        })),
      setSkillFileUrl: (url) => set({ skillFileUrl: url }),
      setDeployment: (agentId, apiKey) => set({ agentId, apiKey }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 5) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      goToStep: (step) => set({ currentStep: step }),
      reset: () => set(initialState),
    }),
    {
      name: 'humuter-onboarding',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
