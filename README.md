# Think Big with AI — Adaptive Video Tutor

An AI-powered adaptive learning MVP built for the **Google Startup Buildathon India 2026**.

## Features
- **Base Lesson:** 7-scene Remotion video teaching BODMAS via a 4-tier priority model (played live in-browser via `@remotion/player`).
- **5-Agent Remediation Loop:**
  - **Agent 5 (Evaluator):** 4-MCQ diagnostic check (3 text-based + 1 numeric) with 100% pass threshold, 1 hint + retry, and misconception logging.
  - **Agent 1 (Content Generator) $\leftrightarrow$ Agent 2 (Judge):** Drafts and reviews targeted remedial storyboards (up to 3 rounds) and fresh retests.
  - **Agent 3 (Director):** Converts approved storyboards into validated Remotion `SceneTimeline` JSON.
  - **Agent 4 (Engineer):** Publishes ready lessons to the learner's home screen asynchronously.
- **Live Agent Inspector:** Real-time drawer showing agent activity, Judge scores, and JSON payloads.

## Local Development
1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
2. Install and start:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173`.

## Deploy to Google Cloud Run
Ensure `gcloud` CLI is installed and authenticated against a billing-enabled GCP project:

```bash
gcloud run deploy thinkbigwithaitutor \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --no-cpu-throttling \
  --set-env-vars GEMINI_API_KEY="YOUR_KEY_HERE"
```

(`--min-instances 1 --no-cpu-throttling` keeps the in-process background worker running for async remedial lessons.)
