export interface NewsletterClientConfig {
  baseUrl: string;
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
  status: string;
  message: string;
}

export interface ContentEdgeApiResponse<T> {
  status: string;
  message?: string;
  data?: T;
}
