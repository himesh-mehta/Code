export interface PageContextData {
  route: string;
  page_name: string;
  page_purpose?: string;
  filters?: Record<string, any>;
  metrics?: Record<string, any>;
  selected_item?: Record<string, any>;
  sample_data_status?: string;
  key_records?: Array<Record<string, any>>;
  data_freshness?: string;
  additional_notes?: string;
}

export interface AssistantChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  status?: "sending" | "sent" | "error";
  error?: string;
}

export interface AssistantChatResponse {
  reply: string;
  suggested_followups: string[];
  provider: string;
  model: string;
  status: string;
}

export const assistantApi = {
  async sendChat(
    message: string,
    history: AssistantChatMessage[],
    context: PageContextData
  ): Promise<AssistantChatResponse> {
    const cleanHistory = history
      .filter((h) => h.status !== "error")
      .slice(-8)
      .map((h) => ({
        role: h.role,
        content: h.content,
      }));

    const res = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history: cleanHistory,
        context,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(
        errJson.error || `Server responded with HTTP ${res.status}`
      );
    }

    return await res.json();
  },

  async getStatus(): Promise<{
    status: string;
    configured: boolean;
    provider: string;
    model: string;
  }> {
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "GET",
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return {
      status: "unknown",
      configured: false,
      provider: "offline",
      model: "none",
    };
  },
};
