export interface NewsletterClientConfig {
  baseUrl: string;
  /** Tenant domain used by ContentEdge public newsletter routes. */
  tenant: string;
  formKey: string;
  fetch?: typeof fetch;
  /** Aborts any request that takes longer than this many milliseconds. */
  timeoutMs?: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export type PublicFormPurpose = "SUBSCRIPTION" | "ENQUIRY" | "SUBSCRIPTION_AND_ENQUIRY";

/**
 * Browser-safe form configuration. ContentEdge never exposes target lists, templates,
 * sender identities, enquiry recipients, or allowed origins to public clients.
 */
export interface PublicFormConfig {
  formKey: string;
  purpose: PublicFormPurpose;
  consentText?: string;
  consentRequired: boolean;
  captchaRequired: boolean;
  doubleOptInRequired: boolean;
  allowedFields: string[];
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
