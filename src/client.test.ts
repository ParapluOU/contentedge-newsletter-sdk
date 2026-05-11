import { describe, expect, it, vi } from "vitest";
import { createNewsletterClient } from "./client";
import { ContentEdgeNewsletterError } from "./errors";
import type { ContentEdgeApiResponse, NewsletterClientConfig, PublicNewsletterResponse } from "./types";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function createJsonFetch(
  payload: ContentEdgeApiResponse<PublicNewsletterResponse>,
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

describe("createNewsletterClient", () => {
  it("submits subscriptions to the tenant form endpoint", async () => {
    const { calls, fetcher } = createJsonFetch({
      status: "OK",
      data: { status: "ACCEPTED", message: "Confirmation email queued." },
    });

    const response = await createClient(fetcher).subscribe({
      email: "reader@example.com",
      firstName: "Ada",
      consent: true,
      captchaToken: "captcha-token",
      honeypot: "",
    });

    expect(response).toEqual({ status: "ACCEPTED", message: "Confirmation email queued." });
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
      status: "OK",
      data: { status: "ACCEPTED", message: "Enquiry accepted." },
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

  it("posts confirmation and unsubscribe tokens to token endpoints", async () => {
    const { calls, fetcher } = createJsonFetch({
      status: "OK",
      data: { status: "ACCEPTED", message: "Token accepted." },
    });
    const client = createClient(fetcher);

    await client.confirm("confirm-token");
    await client.unsubscribe("unsubscribe-token");

    expect(calls.map((call) => ({ url: call.url, body: call.init?.body }))).toEqual([
      {
        url: "https://api.contentedgecms.com/api/public/newsletter/subscriptions/confirm",
        body: JSON.stringify({ token: "confirm-token" }),
      },
      {
        url: "https://api.contentedgecms.com/api/public/newsletter/subscriptions/unsubscribe",
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

  it("throws ContentEdgeNewsletterError when a successful response has no data", async () => {
    const { fetcher } = createJsonFetch({ status: "OK" });

    await expect(createClient(fetcher).unsubscribe("unsubscribe-token")).rejects.toBeInstanceOf(
      ContentEdgeNewsletterError
    );
    await expect(createClient(fetcher).unsubscribe("unsubscribe-token")).rejects.toMatchObject({
      message: "ContentEdge response did not include data",
    });
  });
});
