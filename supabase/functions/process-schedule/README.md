# process-schedule

Deploy this function with Supabase CLI and set the Gemini key as a server secret.

```bash
supabase functions deploy process-schedule
supabase secrets set GEMINI_API_KEY="YOUR_GEMINI_KEY" GEMINI_MODEL="gemini-3.6-flash"
```

The Gemini key is never sent to the browser.
