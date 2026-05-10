import { ContentEdgeNewsletterError } from "./errors";
import type {
  ContentEdgeApiResponse,
  EnquiryRequest,
  NewsletterClientConfig,
  PublicNewsletterResponse,
  SubscribeRequest,
} from "./types";

export function createNewsletterClient(config: NewsletterClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const fetcher = config.fetch ?? fetch;

  async function post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let payload: ContentEdgeApiResponse<T> | undefined;
    try {
      payload = (await response.json()) as ContentEdgeApiResponse<T>;
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      throw new ContentEdgeNewsletterError(
        payload?.message ?? `ContentEdge request failed with status ${response.status}`,
        response.status,
        payload
      );
    }

    if (!payload?.data) {
      throw new ContentEdgeNewsletterError("ContentEdge response did not include data", response.status, payload);
    }

    return payload.data;
  }

  return {
    subscribe(request: SubscribeRequest): Promise<PublicNewsletterResponse> {
      return post(
        `/api/public/newsletter/tenants/${encodeURIComponent(config.tenant)}/forms/${encodeURIComponent(config.formKey)}/subscriptions`,
        request
      );
    },

    submitEnquiry(request: EnquiryRequest): Promise<PublicNewsletterResponse> {
      return post(
        `/api/public/newsletter/tenants/${encodeURIComponent(config.tenant)}/forms/${encodeURIComponent(config.formKey)}/enquiries`,
        request
      );
    },

    confirm(token: string): Promise<PublicNewsletterResponse> {
      return post("/api/public/newsletter/subscriptions/confirm", { token });
    },

    unsubscribe(token: string): Promise<PublicNewsletterResponse> {
      return post("/api/public/newsletter/subscriptions/unsubscribe", { token });
    },
  };
}

export type NewsletterClient = ReturnType<typeof createNewsletterClient>;
