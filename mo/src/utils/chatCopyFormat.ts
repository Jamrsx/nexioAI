import type { LocalMessage } from '../types/chat';

const ROLE_LABEL: Record<LocalMessage['role'], string> = {
  user: 'You',
  assistant: 'NexioAI',
  system: 'System',
};

export function formatMessageForCopy(message: LocalMessage): string {
  const label = ROLE_LABEL[message.role];
  const body = message.content.trim();
  return `${label}:\n${body}`;
}

export function formatConversationForCopy(
  messages: LocalMessage[],
  title?: string | null,
): string {
  const visible = messages.filter(m => m.role !== 'system');
  if (visible.length === 0) {
    return '';
  }

  const blocks: string[] = [];
  if (title?.trim()) {
    blocks.push(title.trim(), '');
  }

  for (const message of visible) {
    blocks.push(formatMessageForCopy(message), '');
  }

  return blocks.join('\n').trimEnd();
}
