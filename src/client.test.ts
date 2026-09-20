import { describe, expect, it, vi } from "vitest";
import { createNewsletterClient } from "./client";
import { ContentEdgeNewsletterError } from "./errors";
import type {
  ContentEdgeApiResponse,
  NewsletterClientConfig,
  PublicFormConfig,
  PublicNewsletterResponse,
} from "./types";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

const hangingFetch: NonNullable<NewsletterClientConfig["fetch"]> = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

function createJsonFetch<T = PublicNewsletterResponse>(
  payload: ContentEdgeApiResponse<T>,
  responseInit: ResponseInit = { status: 200 }
) {
  const calls: FetchCall[] = [];
  const fetcher: NonNullable<NewsletterClientConfig["fetch"]> = vi.fn(async (input, init) => {
    calls.push({ url: String(input), init });

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
      ...responseInit,
    });
  });

  return { calls, fetcher };
}

function createClient(fetcher: NonNullable<NewsletterClientConfig["fetch"]>) {
  return createNewsletterClient({
    baseUrl: "https://api.contentedgecms.com/",
    tenant: "game hearts",
    formKey: "homepage/newsletter",
    fetch: fetcher,
  });
}

function parsedBody(call: FetchCall) {
  return JSON.parse(String(call.init?.body)) as Record<string, unknown>;
}

describe("createNewsletterClient", () => {
  it("submits subscriptions to the tenant form endpoint", async () => {
    const { calls, fetcher } = createJsonFetch({
      status: "SUCCESS",
      data: { status: "ACCEPTED", message: "If this email can be subscribed, a confirmation email will be sent." },
    });

    const response = await createClient(fetcher).subscribe({
      email: "reader@example.com",
      firstName: "Ada",
      consent: true,
      captchaToken: "captcha-token",
      honeypot: "",
    });

    expect(response).toEqual({ status: "ACCEPTED", message: "If this email can be subscribed, a confirmation email will be sent." });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: "https://api.contentedgecms.com/api/public/newsletter/tenants/game%20hearts/forms/homepage%2Fnewsletter/subscriptions",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "reader@example.com",
          firstName: "Ada",
          consent: true,
          captchaToken: "captcha-token",
          honeypot: "",
        }),
      },
    });
  });

  it("submits enquiries without exposing recipients or templates", async () => {
    const { calls, fetcher } = createJsonFetch({
      status: "SUCCESS",
      data: { status: "RECEIVED", message: "Enquiry received" },
    });

    await createClient(fetcher).submitEnquiry({
      fields: {
        email: "reader@example.com",
        message: "Hello",
      },
      captchaToken: "captcha-token",
    });

    expect(calls[0]).toMatchObject({
      url: "https://api.contentedgecms.com/api/public/newsletter/tenants/game%20hearts/forms/homepage%2Fnewsletter/enquiries",
      init: {
        method: "POST",
        body: JSON.stringify({
          fields: {
            email: "reader@example.com",
            message: "Hello",
          },
          captchaToken: "captcha-token",
        }),
      },
    });
  });

  it("keeps admin-owned form configuration out of public request bodies", async () => {
    const { calls, fetcher } = createJsonFetch({
      status: "SUCCESS",
      data: { status: "ACCEPTED", message: "Accepted" },
    });
    const client = createClient(fetcher);

    await client.subscribe({
      email: "reader@example.com",
      attributes: { source: "homepage" },
      consent: true,
    });
    await client.submitEnquiry({
      fields: {
        email: "reader@example.com",
        message: "Hello",
      },
    });

    const forbiddenPublicFields = [
      "purpose",
      "targetListId",
      "listId",
      "listName",
      "senderIdentityId",
      "confirmationTemplateId",
      "enquiryTemplateId",
      "enquiryRecipients",
      "recipients",
    ];

    expect(calls.map(parsedBody)).toEqual([
      {
        email: "reader@example.com",
        attributes: { source: "homepage" },
        consent: true,
      },
      {
        fields: {
          email: "reader@example.com",
          message: "Hello",
        },
      },
    ]);
    for (const body of calls.map(parsedBody)) {
      for (const field of forbiddenPublicFields) {
        expect(body).not.toHaveProperty(field);
      }
    }
  });

  it("posts confirmation and unsubscribe tokens to token endpoints", async () => {
    const { calls, fetcher } = createJsonFetch({
      status: "SUCCESS",
      data: { status: "SUBSCRIBED", message: "Subscription confirmed" },
    });
    const client = createClient(fetcher);

    await client.confirm("confirm-token");
    await client.unsubscribe("unsubscribe-token");

    expect(calls.map((call) => ({ url: call.url, body: call.init?.body }))).toEqual([
      {
        url: "https://api.contentedgecms.com/api/public/newsletter/tenants/game%20hearts/subscriptions/confirm",
        body: JSON.stringify({ token: "confirm-token" }),
      },
      {
        url: "https://api.contentedgecms.com/api/public/newsletter/tenants/game%20hearts/subscriptions/unsubscribe",
        body: JSON.stringify({ token: "unsubscribe-token" }),
      },
    ]);
  });

  it("throws ContentEdgeNewsletterError when the API rejects a request", async () => {
    const { fetcher } = createJsonFetch(
      {
        status: "ERROR",
        message: "Captcha verification failed.",
      },
      { status: 400 }
    );

    await expect(createClient(fetcher).subscribe({ email: "reader@example.com", consent: true })).rejects.toMatchObject({
      name: "ContentEdgeNewsletterError",
      message: "Captcha verification failed.",
      status: 400,
      details: {
        status: "ERROR",
        message: "Captcha verification failed.",
      },
    });
  });

  it("uses ProblemDetail messages when Spring returns a non-ApiResponse error", async () => {
    const { fetcher } = createJsonFetch(
      {
        title: "Bad Request",
        detail: "Unknown tenant",
        status: 400,
      } as unknown as ContentEdgeApiResponse<PublicNewsletterResponse>,
      { status: 400 }
    );

    await expect(createClient(fetcher).unsubscribe("token")).rejects.toMatchObject({
      name: "ContentEdgeNewsletterError",
      message: "Unknown tenant",
      status: 400,
    });
  });

  it("reads public form configuration without sending a request body", async () => {
    const { calls, fetcher } = createJsonFetch<PublicFormConfig>({
      status: "SUCCESS",
      data: {
        formKey: "homepage/newsletter",
        purpose: "SUBSCRIPTION",
        consentText: "I agree",
        consentRequired: true,
        captchaRequired: false,
        doubleOptInRequired: true,
        allowedFields: ["source"],
      },
    });

    const config = await createClient(fetcher).getFormConfig();

    expect(config).toEqual({
      formKey: "homepage/newsletter",
      purpose: "SUBSCRIPTION",
      consentText: "I agree",
      consentRequired: true,
      captchaRequired: false,
      doubleOptInRequired: true,
      allowedFields: ["source"],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://api.contentedgecms.com/api/public/newsletter/tenants/game%20hearts/forms/homepage%2Fnewsletter"
    );
    expect(calls[0].init?.method).toBe("GET");
    expect(calls[0].init?.body).toBeUndefined();
    expect(calls[0].init?.headers).toBeUndefined();
  });

  it("forwards a caller supplied abort signal to fetch", async () => {
    const controller = new AbortController();
    const client = createClient(hangingFetch);

    const pending = client.subscribe({ email: "reader@example.com", consent: true }, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toBeDefined();
  });

  it("aborts the request when the configured timeout elapses", async () => {
    const client = createNewsletterClient({
      baseUrl: "https://api.contentedgecms.com",
      tenant: "game hearts",
      formKey: "homepage/newsletter",
      fetch: hangingFetch,
      timeoutMs: 5,
    });

    await expect(client.getFormConfig()).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("leaves the signal unset when no timeout or caller signal is supplied", async () => {
    const { calls, fetcher } = createJsonFetch({
      status: "SUCCESS",
      data: { status: "ACCEPTED", message: "Accepted" },
    });

    await createClient(fetcher).subscribe({ email: "reader@example.com", consent: true });

    expect(calls[0].init?.signal).toBeUndefined();
  });

  it("throws ContentEdgeNewsletterError when a successful response has no data", async () => {
    const { fetcher } = createJsonFetch({ status: "SUCCESS" });

    await expect(createClient(fetcher).unsubscribe("unsubscribe-token")).rejects.toBeInstanceOf(
      ContentEdgeNewsletterError
    );
    await expect(createClient(fetcher).unsubscribe("unsubscribe-token")).rejects.toMatchObject({
      message: "ContentEdge response did not include data",
    });
  });
});
