import { Agent } from '@/lib/types/agent';
import { AGENT_TYPES } from '@/lib/constants/agent-types';

export function buildSystemPrompt(agent: Agent): string {
  const agentTypeDef = AGENT_TYPES.find((t) => t.id === agent.agent_type);
  const td = agent.training_data;

  const parts: string[] = [];

  // Base role
  if (agentTypeDef) {
    parts.push(`You are a ${agentTypeDef.name} AI agent. ${agentTypeDef.description}`);
  } else {
    parts.push('You are an AI agent.');
  }

  // Project identity
  if (td.project_name) {
    parts.push(`You represent the project "${td.project_name}".`);
  }
  if (td.project_description) {
    parts.push(`Project description: ${td.project_description}`);
  }

  // Tone
  if (td.tone) {
    parts.push(`Communication tone: ${td.tone}. Always maintain this tone in your responses.`);
  }

  // Knowledge
  if (td.key_topics) {
    parts.push(`Key topics you are knowledgeable about: ${td.key_topics}`);
  }
  if (td.target_audience) {
    parts.push(`Your target audience: ${td.target_audience}`);
  }
  if (td.website_url) {
    parts.push(`Project website: ${td.website_url}`);
  }

  // Restrictions
  if (td.avoid_topics) {
    parts.push(`NEVER discuss these topics: ${td.avoid_topics}`);
  }

  // Type-specific prompts
  switch (agent.agent_type) {
    case 'community_manager':
      appendCommunityManagerPrompt(parts, td);
      break;
    case 'kol':
      appendKOLPrompt(parts, td);
      break;
    case 'customer_service':
      appendCustomerServicePrompt(parts, td);
      break;
    case 'protocol_onboarding':
      appendProtocolOnboardingPrompt(parts, td);
      break;
    case 'other':
      appendCustomAgentPrompt(parts, td);
      break;
  }

  // Skill file content (stored as text in training_data)
  if (td.skill_file_content) {
    parts.push(`Additional knowledge and instructions:\n${td.skill_file_content}`);
  }

  return parts.join('\n\n');
}

function appendCommunityManagerPrompt(
  parts: string[],
  td: Record<string, string>
) {
  parts.push(
    'You are managing a community group chat. Your behavior:',
    '- Answer community members\' questions accurately and concisely.',
    '- Enforce community rules when violations occur.',
    '- Welcome new members warmly.',
    '- Keep responses short and suitable for group chat — no essays.',
    '- If you don\'t know something, direct users to official resources or a human team member. Never say "I don\'t know" without offering an alternative.'
  );

  if (td.community_rules) {
    parts.push(`Community rules to enforce:\n${td.community_rules}`);
  }
  if (td.faq_items) {
    parts.push(`FAQ knowledge base:\n${td.faq_items}`);
  }
  if (td.escalation_contact) {
    parts.push(
      `When you cannot help or detect a serious issue, escalate to: ${td.escalation_contact}`
    );
  }
  if (td.welcome_message) {
    parts.push(
      `When welcoming new members, use this as a base: ${td.welcome_message}`
    );
  }
}

function appendKOLPrompt(parts: string[], td: Record<string, string>) {
  parts.push(
    'You act as the project\'s ambassador and thought leader.',
    '- Create engaging, educational content about the project.',
    '- Stay on-brand and maintain the project\'s voice.',
    '- Highlight the project\'s unique value propositions.'
  );

  if (td.key_narratives) {
    parts.push(`Key narratives and talking points:\n${td.key_narratives}`);
  }
  if (td.competitors) {
    parts.push(`Competitive positioning:\n${td.competitors}`);
  }
  if (td.recent_milestones) {
    parts.push(`Recent milestones to reference:\n${td.recent_milestones}`);
  }
  if (td.content_style) {
    parts.push(`Content style examples:\n${td.content_style}`);
  }
}

function appendCustomerServicePrompt(
  parts: string[],
  td: Record<string, string>
) {
  parts.push(
    'You are a customer service agent.',
    '- Help users resolve issues step by step.',
    '- Be patient and thorough in troubleshooting.',
    '- Escalate to a human when necessary.'
  );

  if (td.common_issues) {
    parts.push(`Common issues and solutions:\n${td.common_issues}`);
  }
  if (td.docs_url) {
    parts.push(`Link users to documentation when relevant: ${td.docs_url}`);
  }
  if (td.support_hours) {
    parts.push(`Human support hours: ${td.support_hours}`);
  }
  if (td.escalation_criteria) {
    parts.push(`Escalation criteria:\n${td.escalation_criteria}`);
  }
}

function appendProtocolOnboardingPrompt(
  parts: string[],
  td: Record<string, string>
) {
  parts.push(
    'You guide new users through the protocol.',
    '- Provide clear, step-by-step instructions.',
    '- Be encouraging and patient with beginners.',
    '- Explain technical concepts simply.'
  );

  if (td.getting_started_steps) {
    parts.push(`Getting started guide:\n${td.getting_started_steps}`);
  }
  if (td.supported_wallets) {
    parts.push(`Supported wallets: ${td.supported_wallets}`);
  }
  if (td.supported_chains) {
    parts.push(`Supported chains: ${td.supported_chains}`);
  }
  if (td.common_errors) {
    parts.push(`Common errors and fixes:\n${td.common_errors}`);
  }
}

function appendCustomAgentPrompt(parts: string[], td: Record<string, string>) {
  if (td.custom_role) {
    parts.push(`Your role: ${td.custom_role}`);
  }
  if (td.custom_instructions) {
    parts.push(`Specific instructions:\n${td.custom_instructions}`);
  }
  if (td.example_interactions) {
    parts.push(
      `Follow these example interactions as a guide:\n${td.example_interactions}`
    );
  }
}
