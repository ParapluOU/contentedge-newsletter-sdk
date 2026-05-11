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

The SDK never accepts API keys, list IDs, template IDs, sender identities, or arbitrary recipients. Those are resolved server-side through the configured ContentEdge public form.

## Publishing

The release workflow publishes from the `master` branch with npm trusted publishing and provenance enabled. Before the first release, configure the npm package trusted publisher for:

- Repository: `ParapluOU/contentedge-newsletter-sdk`
- Workflow: `.github/workflows/main.yml`
- Branch: `master`

The `repository.url` field in `package.json` must keep matching the GitHub repository exactly, because npm validates it during trusted publishing.
