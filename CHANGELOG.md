# Changelog

## 0.2.0

- Add `getFormConfig` for reading the browser-safe configuration of a public form: purpose, consent text and whether consent is mandatory, captcha requirement, double opt-in requirement, and allowed field keys. Admin-owned settings such as target lists, templates, sender identities, enquiry recipients, and allowed origins are never exposed.
- Add `timeoutMs` on the client config and an optional `RequestOptions` argument with `signal` on every method, so requests can be bounded or cancelled. Aborts and timeouts propagate unwrapped so `error.name` checks keep working.
- Export the `PublicFormConfig`, `PublicFormPurpose`, and `RequestOptions` types.
- Document that allowed origins are required on every public request, including `getFormConfig`. Forms without allowed origins reject all public traffic, so server-side usage must supply an `Origin` header.
- Document the subscriber lifecycle, the two error body shapes the API returns, rate limit behaviour, and the ContentEdge-hosted confirmation and unsubscribe landing pages.
- Document public form purposes and clarify that sender identities, recipients, templates, lists, and purpose remain ContentEdge-managed configuration.
- Add regression coverage that SDK request bodies contain only public visitor data.

## 0.1.3

- Support Spring `ProblemDetail` error bodies in addition to the ContentEdge `ApiResponse` envelope, and reject successful responses that carry no `data`.
- Tighten the client and API response type definitions, including the `PublicNewsletterResponse` status union.
- Clarify the tenant domain and response status types in the README.

## 0.1.2

- Expand the public README with installation, quick start, API reference, error handling, and support guidance.

## 0.1.1

- Add MIT license metadata and license file.
- Remove internal publishing notes from the public README.

## 0.1.0

- Initial SDK release.
