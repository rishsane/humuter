import { createServiceClient } from '@/lib/supabase/service';
import { BASE_QUESTIONS, TYPE_SPECIFIC_QUESTIONS } from '@/lib/constants/questionnaires';
import type { Question } from '@/lib/constants/questionnaires';
import {
  sendMessage,
  sendInlineKeyboard,
  answerCallbackQuery,
  getFile,
  validateBotToken,
} from './utils';
import {
  WELCOME_MESSAGE,
  getWelcomeKeyboard,
  getAgentTypeMessage,
  getAgentTypeKeyboard,
  getPlanMessage,
  getPlanKeyboard,
  getBillingCycleMessage,
  getBillingCycleKeyboard,
  getPaymentMessage,
  COLLECT_EMAIL_MESSAGE,
  getVerifyOtpMessage,
  UPLOAD_FILE_MESSAGE,
  getUploadFileKeyboard,
  COLLECT_BOT_TOKEN_MESSAGE,
  getDeploySuccessMessage,
  ENTERPRISE_MESSAGE,
  ALREADY_HAS_AGENT_MESSAGE,
  getSkipButton,
  type OnboardingSession,
  type OnboardingStep,
} from './steps';
import { generateOtp, sendOtpEmail, verifyOtp, isValidEmail } from './email';
import { getPaymentAmount, getDepositAddress, verifyUsdcPayment } from './payment';
import { createAgent } from './agent';

// --- Session helpers ---

export async function getOrCreateSession(
  tgUserId: number,
  tgUsername?: string
): Promise<OnboardingSession> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('tg_onboarding_sessions')
    .select('*')
    .eq('tg_user_id', tgUserId)
    .single();

  if (existing) {
    // Update username if changed
    if (tgUsername && existing.tg_username !== tgUsername) {
      await supabase
        .from('tg_onboarding_sessions')
        .update({ tg_username: tgUsername, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
    return existing as OnboardingSession;
  }

  const { data: created, error } = await supabase
    .from('tg_onboarding_sessions')
    .insert({
      tg_user_id: tgUserId,
      tg_username: tgUsername || null,
      step: 'welcome',
      training_data: {},
    })
    .select()
    .single();

  if (error) {
    console.error('[onboarding] Failed to create session:', error.message);
    throw error;
  }

  return created as OnboardingSession;
}

async function updateSession(
  sessionId: string,
  updates: Partial<OnboardingSession>
) {
  const supabase = createServiceClient();
  await supabase
    .from('tg_onboarding_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

// --- Get all questions for current session ---

function getAllQuestions(agentType: string): Question[] {
  const typeQuestions = TYPE_SPECIFIC_QUESTIONS[agentType] || [];
  return [...BASE_QUESTIONS, ...typeQuestions];
}

// --- Step handlers ---

export async function handleWelcome(
  chatId: number,
  session: OnboardingSession
) {
  await sendInlineKeyboard(chatId, WELCOME_MESSAGE, getWelcomeKeyboard());
}

export async function handleStart(
  chatId: number,
  session: OnboardingSession
) {
  // Reset session for fresh start
  await updateSession(session.id, {
    step: 'welcome',
    agent_type: null,
    plan: null,
    billing_cycle: 'monthly',
    email: null,
    email_otp: null,
    email_verified: false,
    training_data: {},
    current_question_index: 0,
    skill_file_content: null,
    bot_token: null,
    payment_address: null,
    payment_amount: null,
    payment_tx_hash: null,
    payment_verified: false,
    agent_id: null,
  } as Partial<OnboardingSession>);
  await handleWelcome(chatId, session);
}

export async function handleCallbackQuery(
  chatId: number,
  session: OnboardingSession,
  callbackQueryId: string,
  data: string
) {
  await answerCallbackQuery(callbackQueryId);

  const [action, value] = data.split(':');

  switch (action) {
    case 'start':
      await handleChooseAgentType(chatId, session);
      break;

    case 'agent_type':
      await handleAgentTypeSelected(chatId, session, value);
      break;

    case 'plan':
      await handlePlanSelected(chatId, session, value);
      break;

    case 'billing':
      await handleBillingCycleSelected(chatId, session, value);
      break;

    case 'upload':
      if (value === 'skip') {
        await updateSession(session.id, { step: 'collect_bot_token' as OnboardingStep });
        await sendMessage(chatId, COLLECT_BOT_TOKEN_MESSAGE);
      }
      break;

    case 'skip':
      await handleSkipQuestion(chatId, session);
      break;

    case 'tone':
      await handleTrainingAnswer(chatId, session, value);
      break;

    default:
      break;
  }
}

async function handleChooseAgentType(
  chatId: number,
  session: OnboardingSession
) {
  await updateSession(session.id, { step: 'choose_agent_type' as OnboardingStep });
  await sendInlineKeyboard(chatId, getAgentTypeMessage(), getAgentTypeKeyboard());
}

async function handleAgentTypeSelected(
  chatId: number,
  session: OnboardingSession,
  agentType: string
) {
  await updateSession(session.id, {
    agent_type: agentType,
    step: 'choose_plan' as OnboardingStep,
  });
  await sendInlineKeyboard(chatId, getPlanMessage(agentType), getPlanKeyboard());
}

async function handlePlanSelected(
  chatId: number,
  session: OnboardingSession,
  planChoice: string
) {
  if (planChoice === 'enterprise') {
    await sendMessage(chatId, ENTERPRISE_MESSAGE);
    return;
  }

  if (planChoice === 'starter_trial') {
    // Free trial — skip payment, go to email collection
    await updateSession(session.id, {
      plan: 'starter',
      payment_verified: true, // trial = no payment needed
      step: 'collect_email' as OnboardingStep,
    });
    await sendMessage(chatId, COLLECT_EMAIL_MESSAGE);
    return;
  }

  if (planChoice === 'starter_paid') {
    await updateSession(session.id, {
      plan: 'starter',
      step: 'choose_billing_cycle' as OnboardingStep,
    });
    await sendInlineKeyboard(chatId, getBillingCycleMessage(), getBillingCycleKeyboard());
    return;
  }
}

async function handleBillingCycleSelected(
  chatId: number,
  session: OnboardingSession,
  cycle: string
) {
  const billingCycle = cycle as 'monthly' | 'annual';
  const amount = getPaymentAmount('starter', billingCycle);
  const address = getDepositAddress();

  await updateSession(session.id, {
    billing_cycle: billingCycle,
    payment_amount: amount,
    payment_address: address,
    step: 'payment' as OnboardingStep,
  });

  await sendMessage(chatId, getPaymentMessage(amount, address));
}

export async function handleTextMessage(
  chatId: number,
  session: OnboardingSession,
  text: string,
  document?: { file_id: string; file_name?: string }
) {
  switch (session.step) {
    case 'payment':
      await handlePaymentTxHash(chatId, session, text);
      break;

    case 'collect_email':
      await handleEmailInput(chatId, session, text);
      break;

    case 'verify_otp':
      await handleOtpInput(chatId, session, text);
      break;

    case 'training_questions':
      await handleTrainingAnswer(chatId, session, text);
      break;

    case 'upload_file':
      if (document) {
        await handleFileUpload(chatId, session, document);
      } else {
        await sendMessage(chatId, 'Please send a <code>.md</code> or <code>.txt</code> file, or tap Skip.');
      }
      break;

    case 'collect_bot_token':
      await handleBotTokenInput(chatId, session, text);
      break;

    default:
      // User sent text on a step that expects a button tap
      await sendMessage(chatId, 'Please use the buttons above to continue, or type /start to restart.');
      break;
  }
}

async function handlePaymentTxHash(
  chatId: number,
  session: OnboardingSession,
  txHash: string
) {
  const trimmed = txHash.trim();
  if (!trimmed.startsWith('0x') || trimmed.length < 60) {
    await sendMessage(chatId, 'That doesn\'t look like a valid transaction hash. It should start with <code>0x</code> and be 66 characters long. Please try again.');
    return;
  }

  await sendMessage(chatId, 'Verifying your transaction...');

  const result = await verifyUsdcPayment(trimmed);

  if (result.verified) {
    await updateSession(session.id, {
      payment_tx_hash: trimmed,
      payment_verified: true,
      step: 'collect_email' as OnboardingStep,
    });
    await sendMessage(chatId, 'Payment confirmed! Now let\'s set up your account.');
    await sendMessage(chatId, COLLECT_EMAIL_MESSAGE);
  } else {
    await sendMessage(chatId, `Verification failed: ${result.error}\n\nPlease try again with the correct transaction hash.`);
  }
}

async function handleEmailInput(
  chatId: number,
  session: OnboardingSession,
  email: string
) {
  const trimmed = email.trim().toLowerCase();
  if (!isValidEmail(trimmed)) {
    await sendMessage(chatId, 'That doesn\'t look like a valid email. Please try again.');
    return;
  }

  const otp = generateOtp();
  const sent = await sendOtpEmail(trimmed, otp);

  if (!sent) {
    await sendMessage(chatId, 'Failed to send the verification code. Please try again.');
    return;
  }

  await updateSession(session.id, {
    email: trimmed,
    email_otp: otp,
    step: 'verify_otp' as OnboardingStep,
  });

  await sendMessage(chatId, getVerifyOtpMessage(trimmed));
}

async function handleOtpInput(
  chatId: number,
  session: OnboardingSession,
  code: string
) {
  if (!verifyOtp(session.email_otp, code)) {
    await sendMessage(chatId, 'Invalid code. Please try again.');
    return;
  }

  await sendMessage(chatId, 'Email verified! Setting up your account...');

  // Create or find Supabase user
  const supabase = createServiceClient();
  let supabaseUserId: string | null = null;

  // Try to create new user
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: session.email!,
    email_confirm: true,
    user_metadata: {
      tg_user_id: session.tg_user_id,
      tg_username: session.tg_username,
    },
  });

  if (createError) {
    // User might already exist — look them up
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(
      (u) => u.email === session.email
    );
    if (existingUser) {
      supabaseUserId = existingUser.id;
      // Update user metadata with TG info
      await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          tg_user_id: session.tg_user_id,
          tg_username: session.tg_username,
        },
      });
    } else {
      console.error('[onboarding] Failed to create/find user:', createError.message);
      await sendMessage(chatId, 'Failed to create your account. Please try again or contact support.');
      return;
    }
  } else {
    supabaseUserId = newUser.user.id;
  }

  // Check if user already has an agent
  const { count: agentCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', supabaseUserId)
    .neq('status', 'archived');

  if ((agentCount ?? 0) >= 1) {
    await updateSession(session.id, {
      email_verified: true,
      supabase_user_id: supabaseUserId,
      step: 'done' as OnboardingStep,
    });
    await sendMessage(chatId, ALREADY_HAS_AGENT_MESSAGE);
    return;
  }

  await updateSession(session.id, {
    email_verified: true,
    supabase_user_id: supabaseUserId,
    step: 'training_questions' as OnboardingStep,
    current_question_index: 0,
  });

  // Send first training question
  await sendNextQuestion(chatId, session.id, session.agent_type!, 0, session.training_data);
}

async function sendNextQuestion(
  chatId: number,
  sessionId: string,
  agentType: string,
  questionIndex: number,
  trainingData: Record<string, string>
) {
  const allQuestions = getAllQuestions(agentType);

  if (questionIndex >= allQuestions.length) {
    // All questions answered — move to file upload
    await updateSession(sessionId, { step: 'upload_file' as OnboardingStep });
    await sendInlineKeyboard(chatId, UPLOAD_FILE_MESSAGE, getUploadFileKeyboard());
    return;
  }

  const question = allQuestions[questionIndex];
  const progress = `(${questionIndex + 1}/${allQuestions.length})`;
  const requiredTag = question.required ? '' : ' <i>(optional)</i>';

  if (question.type === 'select' && question.options) {
    // Send as inline keyboard
    const buttons = question.options.map((opt) => [
      { text: opt, callback_data: `tone:${opt}` },
    ]);
    if (!question.required) {
      buttons.push([{ text: 'Skip', callback_data: 'skip' }]);
    }
    await sendInlineKeyboard(
      chatId,
      `${progress} <b>${question.label}</b>${requiredTag}`,
      buttons
    );
  } else {
    // Send as text prompt
    let msg = `${progress} <b>${question.label}</b>${requiredTag}`;
    if (question.placeholder) {
      msg += `\n\n<i>e.g. ${question.placeholder}</i>`;
    }
    if (!question.required) {
      await sendInlineKeyboard(chatId, msg, getSkipButton());
    } else {
      await sendMessage(chatId, msg);
    }
  }
}

async function handleTrainingAnswer(
  chatId: number,
  session: OnboardingSession,
  answer: string
) {
  const allQuestions = getAllQuestions(session.agent_type!);
  const index = session.current_question_index;

  if (index >= allQuestions.length) {
    await updateSession(session.id, { step: 'upload_file' as OnboardingStep });
    await sendInlineKeyboard(chatId, UPLOAD_FILE_MESSAGE, getUploadFileKeyboard());
    return;
  }

  const question = allQuestions[index];

  // Store answer
  const updatedData = { ...session.training_data, [question.id]: answer };
  const nextIndex = index + 1;

  await updateSession(session.id, {
    training_data: updatedData,
    current_question_index: nextIndex,
  });

  // Refresh session data for next question call
  await sendNextQuestion(chatId, session.id, session.agent_type!, nextIndex, updatedData);
}

async function handleSkipQuestion(
  chatId: number,
  session: OnboardingSession
) {
  const allQuestions = getAllQuestions(session.agent_type!);
  const index = session.current_question_index;

  if (index >= allQuestions.length) {
    await updateSession(session.id, { step: 'upload_file' as OnboardingStep });
    await sendInlineKeyboard(chatId, UPLOAD_FILE_MESSAGE, getUploadFileKeyboard());
    return;
  }

  const question = allQuestions[index];
  if (question.required) {
    await sendMessage(chatId, 'This question is required. Please provide an answer.');
    return;
  }

  const nextIndex = index + 1;
  await updateSession(session.id, { current_question_index: nextIndex });
  await sendNextQuestion(chatId, session.id, session.agent_type!, nextIndex, session.training_data);
}

async function handleFileUpload(
  chatId: number,
  session: OnboardingSession,
  document: { file_id: string; file_name?: string }
) {
  const fileName = document.file_name || '';
  if (!fileName.endsWith('.md') && !fileName.endsWith('.txt')) {
    await sendMessage(chatId, 'Please send a <code>.md</code> or <code>.txt</code> file.');
    return;
  }

  await sendMessage(chatId, 'Processing your file...');

  const fileBuffer = await getFile(document.file_id);
  if (!fileBuffer) {
    await sendMessage(chatId, 'Failed to download the file. Please try again.');
    return;
  }

  const content = fileBuffer.toString('utf-8');
  if (content.length > 50000) {
    await sendMessage(chatId, 'File is too large (max 50KB of text). Please send a smaller file.');
    return;
  }

  await updateSession(session.id, {
    skill_file_content: content,
    step: 'collect_bot_token' as OnboardingStep,
  });

  await sendMessage(chatId, `File received (${fileName}). Now let's connect your bot.`);
  await sendMessage(chatId, COLLECT_BOT_TOKEN_MESSAGE);
}

async function handleBotTokenInput(
  chatId: number,
  session: OnboardingSession,
  token: string
) {
  const trimmed = token.trim();

  // Basic format check
  if (!trimmed.includes(':')) {
    await sendMessage(chatId, 'That doesn\'t look like a bot token. It should look like <code>123456:ABC-DEF...</code>. Please try again.');
    return;
  }

  await sendMessage(chatId, 'Validating your bot token...');

  const result = await validateBotToken(trimmed);

  if (!result.valid) {
    await sendMessage(chatId, 'Invalid bot token. Please check the token from @BotFather and try again.');
    return;
  }

  await updateSession(session.id, {
    bot_token: trimmed,
    step: 'deploy' as OnboardingStep,
  });

  await sendMessage(chatId, `Bot <b>@${result.username}</b> verified! Deploying your agent...`);

  // Trigger deployment
  await handleDeploy(chatId, {
    ...session,
    bot_token: trimmed,
  });
}

async function handleDeploy(
  chatId: number,
  session: OnboardingSession
) {
  if (!session.supabase_user_id || !session.bot_token || !session.agent_type) {
    await sendMessage(chatId, 'Something went wrong. Please type /start to try again.');
    return;
  }

  const result = await createAgent({
    userId: session.supabase_user_id,
    agentType: session.agent_type,
    plan: session.plan || 'starter',
    trainingData: session.training_data,
    skillFileContent: session.skill_file_content,
    botToken: session.bot_token,
  });

  if (!result.success) {
    await sendMessage(chatId, `Deployment failed: ${result.error}`);
    return;
  }

  await updateSession(session.id, {
    agent_id: result.agentId!,
    step: 'done' as OnboardingStep,
  });

  await sendMessage(
    chatId,
    getDeploySuccessMessage(result.botUsername || 'your_bot', result.agentId!)
  );
}

export async function handleDocumentMessage(
  chatId: number,
  session: OnboardingSession,
  document: { file_id: string; file_name?: string }
) {
  if (session.step === 'upload_file') {
    await handleFileUpload(chatId, session, document);
  } else {
    await sendMessage(chatId, 'I\'m not expecting a file right now. Please follow the current step.');
  }
}
