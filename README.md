# ContentEdge Newsletter SDK

A lightweight, framework-agnostic TypeScript client for ContentEdge public newsletter forms. It provides a small typed wrapper for subscriptions, public enquiries, confirmation links, and unsubscribe links without requiring a frontend framework.

This SDK models the public newsletter form contract through `tenant` and `formKey`. It does not import or depend on the ContentEdge server code.

> ### Looking for IT services?
> <img src="https://fromulo.com/codesociety.png" align="left" width="80" alt="CodeSociety">
>
> **[CodeSociety](https://codesocietyhub.com/)** is our consulting & contracting arm — specializing in
> **IT architecture**, **XML authoring systems**, **FontoXML integration**, and **TerminusDB consulting**.
> We build structured content platforms and data solutions that power digital publishing.
>
> **[Let's talk! &#8594;](https://codesocietyhub.com/contact.html)**

## Features

- **Framework-agnostic**: Works in browser apps and any runtime with `fetch`.
- **TypeScript-first**: Typed configuration, request payloads, and public responses.
- **Form introspection**: Read the browser-safe form configuration to render the right fields and consent text.
- **Public subscriptions**: Submit email, profile fields, consent, and optional verification inputs.
- **Public enquiries**: Submit structured form fields for contact or enquiry flows.
- **Token helpers**: Confirm subscriptions and unsubscribe using public tokens.
- **Custom fetch support**: Inject your own `fetch` implementation for tests or custom request handling.
- **Cancellation and timeouts**: Pass an `AbortSignal` per call, or set a client-wide `timeoutMs`.
- **Structured errors**: `ContentEdgeNewsletterError` includes HTTP status and response details when available.

## Installation

```bash
npm install @codesocietyou/contentedge-newsletter-sdk
# or
yarn add @codesocietyou/contentedge-newsletter-sdk
# or
pnpm add @codesocietyou/contentedge-newsletter-sdk
```

## Quick Start

### 1. Create a newsletter client

```typescript
import { createNewsletterClient } from "@codesocietyou/contentedge-newsletter-sdk";

const newsletter = createNewsletterClient({
  baseUrl: "https://api.contentedgecms.com",
  tenant: "example",
  formKey: "homepage-newsletter",
});
```

### 2. Read the form configuration

Optional, but it lets you render the form from ContentEdge rather than hardcoding it.

```typescript
const form = await newsletter.getFormConfig();

// form.purpose            -> "SUBSCRIPTION" | "ENQUIRY" | "SUBSCRIPTION_AND_ENQUIRY"
// form.consentText        -> the exact consent statement to display
// form.consentRequired    -> whether `consent: true` is mandatory
// form.captchaRequired    -> whether you must supply a captcha token
// form.allowedFields      -> attribute or enquiry field keys the API accepts
// form.doubleOptInRequired-> whether subscribers must confirm by email
```

### 3. Subscribe a reader

Use `subscribe` with forms configured in ContentEdge for subscription or subscription and enquiry.

```typescript
await newsletter.subscribe({
  email: "reader@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  consent: true,
  captchaToken,
});
```

### 4. Submit an enquiry

Use `submitEnquiry` with forms configured in ContentEdge for enquiry or subscription and enquiry.

```typescript
await newsletter.submitEnquiry({
  fields: {
    email: "reader@example.com",
    name: "Ada Lovelace",
    message: "I would like to hear more about your newsletter.",
  },
  captchaToken,
});
```

### 5. Confirm or unsubscribe

ContentEdge already hosts landing pages for both links at `/confirm-subscription` and `/unsubscribe` on the tenant domain, and the confirmation and unsubscribe emails point there by default. You only need these methods when you host your own landing pages.

```typescript
await newsletter.confirm("confirmation-token");
await newsletter.unsubscribe("unsubscribe-token");
```

## API Reference

### `createNewsletterClient(config)`

Create a client bound to a ContentEdge public newsletter form.

The `formKey` points to an admin-configured public form. That form controls whether the SDK can submit subscriptions, enquiries, or both.

```typescript
interface NewsletterClientConfig {
  baseUrl: string;   // ContentEdge API base URL
  tenant: string;    // Tenant domain used by the public API
  formKey: string;   // Public newsletter form key
  fetch?: typeof fetch;
  timeoutMs?: number; // Aborts any request that exceeds this duration
}
```

Every method accepts an optional trailing `RequestOptions` argument:

```typescript
interface RequestOptions {
  signal?: AbortSignal;
}
```

### `getFormConfig(options?)`

Read the browser-safe configuration of the form this client is bound to. ContentEdge deliberately withholds admin-owned settings: target lists, templates, sender identities, enquiry recipients, and allowed origins are never returned.

```typescript
interface PublicFormConfig {
  formKey: string;
  purpose: "SUBSCRIPTION" | "ENQUIRY" | "SUBSCRIPTION_AND_ENQUIRY";
  consentText?: string;
  consentRequired: boolean;
  captchaRequired: boolean;
  doubleOptInRequired: boolean;
  allowedFields: string[];
}
```

This call is subject to the same allowed-origin rule as the write endpoints, which makes it a useful way to verify that a deployment's origin is configured correctly: a `403` means the origin is not on the form's allowlist, or the form is disabled.

### `subscribe(request, options?)`

Submit a public subscription request.

The target ContentEdge form must be subscription-capable. If the form is enquiry-only, the API rejects the request.

```typescript
interface SubscribeRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, unknown>;
  consent: boolean;
  captchaToken?: string;
  honeypot?: string;
}
```

Returns:

```typescript
interface PublicNewsletterResponse {
  status: "ACCEPTED" | "SUBSCRIBED" | "UNSUBSCRIBED" | "RECEIVED";
  message: string;
}
```

### `submitEnquiry(request, options?)`

Submit a public enquiry request.

The target ContentEdge form must be enquiry-capable. If the form is subscription-only, the API rejects the request.

```typescript
interface EnquiryRequest {
  fields: Record<string, unknown>;
  captchaToken?: string;
  honeypot?: string;
}
```

Returns `PublicNewsletterResponse`.

### `confirm(token, options?)`

Confirm a subscription using a token from a confirmation link.

```typescript
await newsletter.confirm("confirmation-token");
```

Returns `PublicNewsletterResponse`.

### `unsubscribe(token, options?)`

Unsubscribe using a token from an unsubscribe link.

```typescript
await newsletter.unsubscribe("unsubscribe-token");
```

Returns `PublicNewsletterResponse`.

## Error Handling

The SDK throws `ContentEdgeNewsletterError` when the API rejects a request or returns an unexpected response shape.

```typescript
import {
  ContentEdgeNewsletterError,
  createNewsletterClient,
} from "@codesocietyou/contentedge-newsletter-sdk";

try {
  await newsletter.subscribe({
    email: "reader@example.com",
    consent: true,
  });
} catch (error) {
  if (error instanceof ContentEdgeNewsletterError) {
    console.error("Newsletter request failed", error.status, error.details);
  } else {
    console.error("Unknown error", error);
  }
}
```

ContentEdge returns two error body shapes and the SDK reads both: its own `{ status: "ERROR", message }` envelope for validation, security, and rate-limit failures, and Spring's `ProblemDetail` (`{ title, detail, status }`) when the tenant in the URL cannot be resolved. Either way you get a `ContentEdgeNewsletterError` whose `message` is the human-readable reason and whose `details` holds the parsed body.

Statuses worth handling explicitly:

- `400` — validation failed, or the tenant is unknown. For bean validation, `error.details.data` maps field names to messages.
- `403` — the origin is not allowed, the form is disabled, the form does not support the operation you called, or captcha verification failed.
- `429` — a public rate limit was exceeded.

Network failures, aborts, and timeouts are **not** wrapped. They propagate as the underlying `TypeError` or `DOMException` so you can keep checking `error.name === "AbortError"` or `"TimeoutError"`.

## Advanced Usage

### Custom `fetch`

You can provide a custom `fetch` implementation for tests, SSR-compatible environments, or request instrumentation.

```typescript
const newsletter = createNewsletterClient({
  baseUrl: "https://api.contentedgecms.com",
  tenant: "example",
  formKey: "homepage-newsletter",
  fetch: async (input, init) => {
    console.debug("Newsletter request", input);
    return fetch(input, init);
  },
});
```

### Environment Configuration

The client is configured with a base URL and public form identifiers, so applications can switch environments without changing usage code.

```typescript
const newsletter = createNewsletterClient({
  baseUrl: import.meta.env.VITE_CONTENTEDGE_API_URL,
  tenant: import.meta.env.VITE_CONTENTEDGE_TENANT,
  formKey: "homepage-newsletter",
});
```

### Timeouts and cancellation

Set `timeoutMs` to bound every request made by a client:

```typescript
const newsletter = createNewsletterClient({
  baseUrl: "https://api.contentedgecms.com",
  tenant: "example",
  formKey: "homepage-newsletter",
  timeoutMs: 10_000,
});
```

Pass a signal to cancel a single call, for example when a component unmounts:

```typescript
const controller = new AbortController();

const pending = newsletter.subscribe(
  { email: "reader@example.com", consent: true },
  { signal: controller.signal }
);

controller.abort();
```

When both are present the request aborts on whichever fires first.

### Browser origins and server-side usage

ContentEdge validates the browser `Origin` header against the public form's allowed origins on **every** public request, including `getFormConfig`. Allowed origins are required: a form with none configured rejects all public traffic, and ContentEdge disables such forms so the misconfiguration is visible to administrators instead of failing silently.

Browsers set `Origin` automatically. Server-side runtimes usually do not, so SSR, Node.js, integration tests, and backend-to-backend usage **must** supply a custom `fetch` that adds an allowed `Origin` header:

```typescript
const newsletter = createNewsletterClient({
  baseUrl: "https://api.contentedgecms.com",
  tenant: "example",
  formKey: "homepage-newsletter",
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      headers: { ...init?.headers, Origin: "https://example.com" },
    }),
});
```

A request with a missing or unlisted origin fails with `403` and the message `Origin is not allowed for this form`.

### Rate limits

Public endpoints are rate limited per IP, per email, and per form. Exceeding a limit returns `429` with the message `rate limit exceeded`. No `Retry-After` header is sent, so back off on your side rather than retrying immediately.

## Public Form Usage

Applications provide the configured tenant domain, `formKey`, and public form data. The same client API can be used from React, Vue, Svelte, static sites, or plain TypeScript applications.

ContentEdge public forms can be configured for three purposes:

- **Subscription**: call `subscribe`.
- **Enquiry**: call `submitEnquiry`.
- **Subscription and enquiry**: call both methods with the same `tenant` and `formKey`.

Use `getFormConfig` to discover which purpose a form has instead of assuming it.

The browser never sends admin-owned configuration. Target lists, templates, sender identities, enquiry recipients, and allowed origins stay in ContentEdge and are never returned to public clients. Public clients send only visitor-provided data such as email, attributes, enquiry fields, consent, captcha token, and honeypot value.

### Subscriber lifecycle

Understanding how ContentEdge treats a subscriber helps explain the responses you get:

- With double opt-in enabled, `subscribe` creates a `PENDING_VERIFICATION` subscriber that is not yet a member of any contact list. Membership is granted only once the subscriber confirms.
- `subscribe` always resolves with `ACCEPTED` regardless of whether the address is new, already subscribed, or suppressed. This is deliberate: it prevents the form from being used to test whether an address is on file.
- Unsubscribing removes the subscriber from every contact list, so list counts always reflect people who can actually be emailed.
- Addresses that hard bounced, complained, or were cleaned cannot be resubscribed through a public form.

## Versioning

This project follows [Semantic Versioning](https://semver.org/). Breaking changes bump MAJOR.

## License

MIT

## Support

- Issues: https://github.com/ParapluOU/contentedge-newsletter-sdk/issues
- Docs: https://github.com/ParapluOU/contentedge-newsletter-sdk#readme
