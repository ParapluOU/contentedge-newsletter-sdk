import { ContentEdgeNewsletterError } from "./errors";
import type {
  ContentEdgeApiResponse,
  EnquiryRequest,
  NewsletterClientConfig,
  ProblemDetailResponse,
  PublicFormConfig,
  PublicNewsletterResponse,
  RequestOptions,
  SubscribeRequest,
} from "./types";

export function createNewsletterClient(config: NewsletterClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const fetcher = config.fetch ?? fetch;
  const tenantPath = `/api/public/newsletter/tenants/${encodeURIComponent(config.tenant)}`;
  const formPath = `${tenantPath}/forms/${encodeURIComponent(config.formKey)}`;

  function abortSignal(options?: RequestOptions): AbortSignal | undefined {
    const signals: AbortSignal[] = [];
    if (options?.signal) {
      signals.push(options.signal);
    }
    if (config.timeoutMs !== undefined && config.timeoutMs > 0) {
      signals.push(AbortSignal.timeout(config.timeoutMs));
    }
    if (signals.length === 0) {
      return undefined;
    }
    return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const init: RequestInit = { method, signal: abortSignal(options) };
    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }

    const response = await fetcher(`${baseUrl}${path}`, init);

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
    getFormConfig(options?: RequestOptions): Promise<PublicFormConfig> {
      return request("GET", formPath, undefined, options);
    },

    subscribe(body: SubscribeRequest, options?: RequestOptions): Promise<PublicNewsletterResponse> {
      return request("POST", `${formPath}/subscriptions`, body, options);
    },

    submitEnquiry(body: EnquiryRequest, options?: RequestOptions): Promise<PublicNewsletterResponse> {
      return request("POST", `${formPath}/enquiries`, body, options);
    },

    confirm(token: string, options?: RequestOptions): Promise<PublicNewsletterResponse> {
      return request("POST", `${tenantPath}/subscriptions/confirm`, { token }, options);
    },

    unsubscribe(token: string, options?: RequestOptions): Promise<PublicNewsletterResponse> {
      return request("POST", `${tenantPath}/subscriptions/unsubscribe`, { token }, options);
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
