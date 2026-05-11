# ContentEdge Newsletter SDK

Framework-agnostic browser SDK for ContentEdge public newsletter forms.

```ts
import { createNewsletterClient } from "@codesocietyou/contentedge-newsletter-sdk";

const newsletter = createNewsletterClient({
  baseUrl: "https://api.contentedgecms.com",
  tenant: "example",
  formKey: "homepage-newsletter",
});

await newsletter.subscribe({
  email: "reader@example.com",
  firstName: "Ada",
  consent: true,
  captchaToken,
});
```
