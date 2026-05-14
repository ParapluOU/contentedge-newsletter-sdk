import { ContentEdgeNewsletterError } from "./errors";
import type {
  ContentEdgeApiResponse,
  EnquiryRequest,
  NewsletterClientConfig,
  ProblemDetailResponse,
  PublicNewsletterResponse,
  SubscribeRequest,
} from "./types";

export function createNewsletterClient(config: NewsletterClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const fetcher = config.fetch ?? fetch;
  const tenantPath = `/api/public/newsletter/tenants/${encodeURIComponent(config.tenant)}`;

  async function post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let payload: ContentEdgeApiResponse<T> | ProblemDetailResponse | undefined;
    try {
      payload = (await response.json()) as ContentEdgeApiResponse<T>;
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      throw new ContentEdgeNewsletterError(
        errorMessage(payload, response.status),
        response.status,
        payload
      );
    }

    if (!isApiResponse(payload) || !payload.data) {
      throw new ContentEdgeNewsletterError("ContentEdge response did not include data", response.status, payload);
    }

    return payload.data;
  }

  return {
    subscribe(request: SubscribeRequest): Promise<PublicNewsletterResponse> {
      return post(
        `${tenantPath}/forms/${encodeURIComponent(config.formKey)}/subscriptions`,
        request
      );
    },

    submitEnquiry(request: EnquiryRequest): Promise<PublicNewsletterResponse> {
      return post(
        `${tenantPath}/forms/${encodeURIComponent(config.formKey)}/enquiries`,
        request
      );
    },

    confirm(token: string): Promise<PublicNewsletterResponse> {
      return post(`${tenantPath}/subscriptions/confirm`, { token });
    },

    unsubscribe(token: string): Promise<PublicNewsletterResponse> {
      return post(`${tenantPath}/subscriptions/unsubscribe`, { token });
    },
  };
}

export type NewsletterClient = ReturnType<typeof createNewsletterClient>;

function isApiResponse<T>(payload: ContentEdgeApiResponse<T> | ProblemDetailResponse | undefined): payload is ContentEdgeApiResponse<T> {
  return !!payload && "data" in payload;
}

function errorMessage(payload: ContentEdgeApiResponse<unknown> | ProblemDetailResponse | undefined, status: number) {
  if (payload && "message" in payload && payload.message) {
    return payload.message;
  }
  if (payload && "detail" in payload && payload.detail) {
    return payload.detail;
  }
  if (payload && "title" in payload && payload.title) {
    return payload.title;
  }
  return `ContentEdge request failed with status ${status}`;
}
