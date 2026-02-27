import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from '../../config';

type LLMProvider = 'anthropic' | 'openai';

export interface GenerateResult {
  text: string;
  tokensUsed: number;
}

function getDefaultProvider(): LLMProvider {
  return config.llmProvider;
}

export async function generateResponse(
  systemPrompt: string,
  userMessage: string,
  options?: { provider?: LLMProvider }
): Promise<GenerateResult> {
  const provider = options?.provider ?? getDefaultProvider();

  if (provider === 'openai') {
    return generateOpenAI(systemPrompt, userMessage);
  }
  return generateAnthropic(systemPrompt, userMessage);
}

async function generateAnthropic(
  systemPrompt: string,
  userMessage: string
): Promise<GenerateResult> {
  const client = new Anthropic({
    apiKey: config.anthropicApiKey,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content[0];
  const text = block.type === 'text' ? block.text : '';
  const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
  return { text, tokensUsed };
}

async function generateOpenAI(
  systemPrompt: string,
  userMessage: string
): Promise<GenerateResult> {
  const client = new OpenAI({
    apiKey: config.openaiApiKey,
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 1024,
  });

  const text = response.choices[0]?.message?.content ?? '';
  const tokensUsed = (response.usage?.prompt_tokens ?? 0) + (response.usage?.completion_tokens ?? 0);
  return { text, tokensUsed };
}
