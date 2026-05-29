# Chatbot knowledge — PDF sources

Place your PDF files here (for example `faq.pdf` and `user-guide.pdf`).

After adding or updating files, rebuild the search index from the `backend` folder:

```bash
npm run chat:ingest
```

Then restart the API server. Only PDF files in this folder are ingested from `sources/`; curated website text lives in `../website/`.
