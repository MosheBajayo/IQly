
# BRIEF — The AI Builder Challenge (IQly)

> Source of truth for this project. Copied verbatim from https://challenge.arpeely.com/index.html
> and referenced by CLAUDE.md, so every AI session works from the original requirements.

---

## The brief

### Introduction
This challenge is about how you think about growth and optimization, and how you use AI tools to get there — not just what you can ship. Use them freely, and tell us where they helped. It has three parts, and each one lists the formats we accept for its deliverables, so please submit in those formats.

### The company — IQly
IQly is a new company entering the online IQ test market — a short cognitive test that scores a user's IQ and shows them how they rank against everyone else.

IQly has no existing brand presence, no audience, and no product equity. It is launching a sponsored Google Search campaign, and users who click the ad will be directed to the flow you build.

**Targeted keywords**
- "free iq test"
- "iq test"

---

## Part 1 of 3 — AI Quiz Flow: Build the funnel
Your goal is to design and build the entire quiz flow for IQly, end to end, that maximizes CVR (Account creations / Page visits). This is the full path from ad click to account creation — you own every step.

The flow has to work on both mobile phone and desktop. Traffic will arrive on both, so every screen needs to be responsive and feel native to the device — not a desktop layout squeezed onto a phone.

**Make sure it contains**
- **The quiz** — The IQ test itself
- **Results** — The score reveal
- **Account creation** — The signup moment

These three are the essentials — how you shape the rest of the flow is up to you. Add pages, split steps, reorder them, or introduce anything else you believe will lift CVR. There is no required number of screens and no fixed sequence; design the journey the way you would actually launch it.

**Deliverables**
- **Deliverable #1:** A short write-up (1-page max) explaining why you designed the flow this way — and any key decisions you made. We want to understand your reasoning, not just see the final result.
- **Deliverable #2:** A functional, clickable implementation of the full flow that runs in a browser with no backend, and is responsive on both mobile and desktop. A single HTML file with multiple steps, or several linked HTML files, are both fine — a user should be able to click through from the entry screen all the way to the result on either device.

**Accepted formats — Part 1**
- Write-up: PDF · DOCX · Google Docs link · PPTX · Google Slides link
- The flow: .html · .zip of linked files · Live link

The flow must run offline in a browser with no backend and no build step — if you send a .zip, opening index.html should be enough to start clicking through. It must render correctly at both mobile and desktop widths, and any link should be publicly viewable without a login.

---

## Part 2 of 3 — A/B Test Ideation: Three bets you'd actually put spend behind
The flow you built in Part 1 is now live. Before scaling spend on the Google Search campaign, the IQly team wants to systematically test variations to find what drives higher conversion.

**The task**
Design 3 different A/B tests you would run on the flow you built in Part 1. For each test, build the variant and explain your reasoning.

Choose your tests wisely. Prioritize variants you believe could have the highest impact on CVR — we are more interested in the quality of your bets. Each variant should check one focused change (one hypothesis at a time).

Be explicit about which step of the funnel each test targets.

**Deliverables**
- **Deliverable #1:** A short write-up covering, for each of the 3 tests — one paragraph per test:
  - Why you chose this test — the hypothesis behind it and why you believe it can move CVR meaningfully.
  - Which KPIs you would use to measure its performance, and why those are the right signal for this specific hypothesis. Consider step-level metrics alongside overall CVR.
- **Deliverable #2:** 3 functional variants, one per test. Each should be a complete, standalone version of your Part 1 flow, with the single change you are testing applied.

**Accepted formats — Part 2**
- Write-up: PDF · DOCX · Google Docs link · PPTX · Google Slides link
- The 3 variants: 3 × .html · .zip of all three · 3 live links

Name each variant so we can tell them apart and match it to the write-up — for example variant-1-signup-after-q3.html. Each one should be standalone, not a diff or a patch against Part 1.

---

## Part 3 of 3 — Creative Design: Now earn the click
IQly's POC was a success — the company is now ready to scale beyond Google Search. The team needs ad creatives that will drive users into the quiz flow you built. Design mockups for one ad creative in each of the following sizes.

| Size | Format |
|---|---|
| 320 × 50 px | Banner |
| 250 × 250 px | Square banner |
| 1080 × 1920 px | Full-screen mobile |

The goal is to create conversion-focused creatives that carry through to the entry screen of your flow.

**Deliverables**
- **Deliverable #1:** A short write-up (one paragraph per creative) explaining why you chose this ad design.
- **Deliverable #2:** One ad creative for each of the 3 sizes (3 images total). You may use any design tool and create a preview.

**Accepted formats — Part 3**
- Write-up: PDF · DOCX · Google Docs link · PPTX · Google Slides link
- The 3 creatives: PNG · JPG · HTML · Figma link · Canva link · PDF contact sheet

Export each creative at its exact pixel dimensions — 320×50, 250×250 and 1080×1920 — and include the size in the filename. Static images are perfectly fine; an HTML build is welcome but not required.

---

## Submission
- Part 1: AI Quiz Flow — write-up + the full clickable flow
- Part 2: A/B Test Ideation — write-up + 3 variants
- Part 3: Creative Design — write-up + 3 ad creatives

---

## Additional context

**From the invitation email**
- Timeline: complete and submit within 2 days.
- AI: use AI tools throughout. They are interested not only in what is created, but in how you think, experiment, and use AI along the way.
- Focus: thinking process, creativity, growth mindset, and approach to experimentation and optimization. There is no single "right" answer.
- Submission: all files in a single zip, sent by replying (Reply All) to the email — not through the challenge website.

**From the Claude Code setup guide**
- Use the provided tools only for this screening task; the API key is never shared or stored in project files.
- Models: Sonnet or Haiku.
- Grant only the permissions needed; work stays inside the project folder.
- No external agentic harnesses.
