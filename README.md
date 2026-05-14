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
- **Public subscriptions**: Submit email, profile fields, consent, and optional verification inputs.
- **Public enquiries**: Submit structured form fields for contact or enquiry flows.
- **Token helpers**: Confirm subscriptions and unsubscribe using public tokens.
- **Custom fetch support**: Inject your own `fetch` implementation for tests or custom request handling.
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

### 2. Subscribe a reader

```typescript
await newsletter.subscribe({
  email: "reader@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  consent: true,
  captchaToken,
});
```

### 3. Submit an enquiry

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

### 4. Confirm or unsubscribe

```typescript
await newsletter.confirm("confirmation-token");
await newsletter.unsubscribe("unsubscribe-token");
```

## API Reference

### `createNewsletterClient(config)`

Create a client bound to a ContentEdge public newsletter form.

```typescript
interface NewsletterClientConfig {
  baseUrl: string;   // ContentEdge API base URL
  tenant: string;    // Tenant domain used by the public API
  formKey: string;   // Public newsletter form key
  fetch?: typeof fetch;
}
```

### `subscribe(request)`

Submit a public subscription request.

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

### `submitEnquiry(request)`

Submit a public enquiry request.

```typescript
interface EnquiryRequest {
  fields: Record<string, unknown>;
  captchaToken?: string;
  honeypot?: string;
}
```

Returns `PublicNewsletterResponse`.

### `confirm(token)`

Confirm a subscription using a token from a confirmation link.

```typescript
await newsletter.confirm("confirmation-token");
```

Returns `PublicNewsletterResponse`.

### `unsubscribe(token)`

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

### Browser origins and server-side usage

ContentEdge validates the browser `Origin` header against the public form's allowed origins when origins are configured. Browsers set this header automatically; server-side runtimes often do not. If you use the SDK from SSR, Node.js, tests, or another backend process, provide a custom `fetch` that sends an allowed `Origin` header or configure the form accordingly.

## Public Form Usage

Applications provide the configured tenant domain, `formKey`, and public form data. The same client API can be used from React, Vue, Svelte, static sites, or plain TypeScript applications.

## Versioning

This project follows [Semantic Versioning](https://semver.org/). Breaking changes bump MAJOR.

## License

MIT

## Support

- Issues: https://github.com/ParapluOU/contentedge-newsletter-sdk/issues
- Docs: https://github.com/ParapluOU/contentedge-newsletter-sdk#readme
