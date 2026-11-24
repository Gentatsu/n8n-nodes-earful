# n8n-nodes-earful

n8n nodes for [Earful](https://earful.onibaku.co.uk), which collects reviews from Google, Tripadvisor, Trustpilot, the app stores and more, and lets you reply to them.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Example](#example) · [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and install `n8n-nodes-earful`.

## Operations

**Earful Trigger**
- New reviews: starts the workflow once per new review. Optional filters: location, and ratings up to 1 to 4 stars. n8n registers the webhook in Earful when you activate the workflow and removes it when you deactivate it. Each delivery is checked against its `Earful-Signature`.

**Earful**
- Review, Get Many: search reviews, newest first, by site, location, rating, status, sentiment, tag, text or first-seen time. Pages through results with Return All.
- Review, Reply: reply to a review. Earful posts it on the site where it can, otherwise marks it replied and returns the link to reply there.
- Location, Get Many: list locations, or find one by your own reference.

For any other endpoint, use the HTTP Request node with the predefined **Earful API** credential. See the [API reference](https://earful.onibaku.co.uk/api/docs).

## Credentials

In Earful, open Settings, API, New key, and create a key. Choose write access if you want to post replies or use the trigger. Paste the key into the **Earful API** credential in n8n. Keys starting with `ef_test_` use test data.

The trigger needs a plan with webhook alerts (Plus).

## Example

Earful Trigger (ratings up to 2 stars) → Slack, posting the review text and `reviewUrl` to your team, so someone replies the same day.

Or: Schedule Trigger → Earful, Review, Get Many (status Unreplied, sentiment Negative) → your helpdesk.

## Compatibility

Tested with n8n 2.x.

## Resources

- [Earful API reference](https://earful.onibaku.co.uk/api/docs)
- [n8n community nodes](https://docs.n8n.io/integrations/#community-nodes)

## Licence

[MIT](LICENSE.md)
