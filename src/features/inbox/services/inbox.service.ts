import { api } from '@/lib/api';

export interface TagRef {
  id: string;
  name: string;
  color: string;
}

export interface TagLink {
  tag: TagRef;
}

export interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  tags?: TagLink[];
}

export interface ChannelInfo {
  id: string;
  type: string;
  name: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface LastMessage {
  id: string;
  type: string;
  content: Record<string, any>;
  direction: 'INBOUND' | 'OUTBOUND';
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  channelId: string;
  contactId: string;
  assignedToId: string | null;
  status: string;
  protocol: string | null;
  isGroup: boolean;
  lastMessageAt: string | null;
  createdAt: string;
  aiEnabled?: boolean | null;
  aiDisabledBy?: string | null;
  aiDisabledAt?: string | null;
  activeAgentId?: string | null;
  contact: Contact;
  channel: ChannelInfo;
  assignedTo: AgentInfo | null;
  messages: LastMessage[];
  tags?: TagLink[];
  _count: { messages: number };
}

export interface MessageSender {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface StoryReplyContext {
  id?: string;
  url?: string;
  kind?: 'reply' | 'mention';
}

export interface ReplyContext {
  externalMessageId?: string;
  story?: StoryReplyContext;
  ad?: { id?: string; title?: string };
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  durationMs?: number;
  provider: string;
  transcribedAt: string;
}

export interface MessageMetadata {
  isEcho?: boolean;
  replyTo?: ReplyContext | null;
  transcription?: TranscriptionResult | null;
  rawPayload?: any;
  [key: string]: any;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  content: Record<string, any>;
  externalId: string | null;
  status: string;
  senderName: string | null;
  senderId: string | null;
  sender: MessageSender | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  metadata?: MessageMetadata | null;
}

export interface PaginatedResponse<T> {
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const inboxService = {
  async getConversations(params?: Record<string, string>): Promise<{
    conversations: Conversation[];
    pagination: any;
  }> {
    const { data } = await api.get('/conversations', { params });
    return data.data;
  },

  async getConversation(id: string): Promise<Conversation> {
    const { data } = await api.get(`/conversations/${id}`);
    return data.data;
  },

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<{
    messages: Message[];
    pagination: any;
  }> {
    const { data } = await api.get('/messages', {
      params: { conversationId, page, limit },
    });
    return data.data;
  },

  async sendMessage(payload: {
    conversationId: string;
    type: string;
    content: Record<string, any>;
  }): Promise<Message> {
    const { data } = await api.post('/messages', payload);
    return data.data;
  },

  async assignToMe(conversationId: string): Promise<Conversation> {
    const { data } = await api.post(`/conversations/${conversationId}/assign-me`);
    return data.data;
  },

  async closeConversation(conversationId: string): Promise<Conversation> {
    const { data } = await api.post(`/conversations/${conversationId}/close`);
    return data.data;
  },

  async reopenConversation(conversationId: string): Promise<Conversation> {
    const { data } = await api.post(`/conversations/${conversationId}/reopen`);
    return data.data;
  },

  async syncConversation(
    conversationId: string,
  ): Promise<{ imported: number; fetched: number; syncedAt: string }> {
    const { data } = await api.post(`/conversations/${conversationId}/sync`, {});
    return data.data;
  },

  async toggleAi(
    conversationId: string,
    enabled: boolean | null,
  ): Promise<Conversation> {
    const { data } = await api.patch(`/conversations/${conversationId}/ai`, {
      enabled,
    });
    return data.data ?? data;
  },

  async getStatusCounts(): Promise<Record<string, number>> {
    const { data } = await api.get('/conversations/counts');
    return data.data;
  },

  async bulkClose(ids: string[]): Promise<void> {
    await Promise.allSettled(ids.map((id) => api.post(`/conversations/${id}/close`)));
  },

  async bulkAssignToMe(ids: string[]): Promise<void> {
    await Promise.allSettled(ids.map((id) => api.post(`/conversations/${id}/assign-me`)));
  },

  async bulkReopen(ids: string[]): Promise<void> {
    await Promise.allSettled(ids.map((id) => api.post(`/conversations/${id}/reopen`)));
  },

  async resolveMediaUrl(messageId: string): Promise<{ url: string; mimeType?: string }> {
    const { data } = await api.get(`/messages/${messageId}/media`);
    return data.data;
  },

  async transcribeAudio(messageId: string, force = false): Promise<TranscriptionResult> {
    // NOTE: body must be {} (not null) — express.json({ strict: true }) rejects
    // literal "null" with "Unexpected token 'n', \"null\" is not valid JSON".
    const { data } = await api.post(`/messages/${messageId}/transcribe`, {}, {
      params: force ? { force: 'true' } : undefined,
    });
    return data.data;
  },

  async uploadAudio(blob: Blob, filename = 'audio.webm'): Promise<{
    url: string;
    mimeType: string;
    size: number;
  }> {
    const form = new FormData();
    form.append('file', blob, filename);
    const { data } = await api.post('/messages/uploads/audio', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async sendAudioMessage(conversationId: string, blob: Blob): Promise<Message> {
    const upload = await this.uploadAudio(blob);
    return this.sendMessage({
      conversationId,
      type: 'AUDIO',
      content: {
        mediaUrl: upload.url,
        mimeType: upload.mimeType,
        fileSize: upload.size,
      },
    });
  },
};
