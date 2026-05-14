export interface NewsletterClientConfig {
  baseUrl: string;
  /** Tenant domain used by ContentEdge public newsletter routes. */
  tenant: string;
  formKey: string;
  fetch?: typeof fetch;
}

export interface SubscribeRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, unknown>;
  consent: boolean;
  captchaToken?: string;
  honeypot?: string;
}

export interface EnquiryRequest {
  fields: Record<string, unknown>;
  captchaToken?: string;
  honeypot?: string;
}

export interface PublicNewsletterResponse {
  status: "ACCEPTED" | "SUBSCRIBED" | "UNSUBSCRIBED" | "RECEIVED";
  message: string;
}

export interface ContentEdgeApiResponse<T> {
  status: "SUCCESS" | "ERROR";
  message?: string;
  data?: T;
}

export interface ProblemDetailResponse {
  title?: string;
  detail?: string;
  status?: number;
}
