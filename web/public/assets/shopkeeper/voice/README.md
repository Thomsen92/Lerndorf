# Ollie — local dialogue recordings

Twelve fixed MP3s: six dialogue IDs in English and German. Generated on the user's
explicit request (2026-10-28) with ElevenLabs Charlie, an Australian male voice,
using eleven_multilingual_v2. The batch used 989 text characters from the existing
account quota. No subscription purchase or overage was requested.

Own dialogue text; generated audio is subject to the ElevenLabs account's terms.
These recordings are not labelled CC0. `manifest.json` records voice/model,
settings, full spoken text, file sizes and SHA-256 hashes.

Regeneration tooling lives in `web/scripts/audio/generate-ollie.mjs`:

```powershell
cd web
node scripts/audio/generate-ollie.mjs
# Explicitly generate missing files only (uses existing account quota):
node scripts/audio/generate-ollie.mjs --generate
```

The script reads ELEVENLABS_API_KEY from the environment or root `.env.local`.
Never place that key in Vite configuration, client code, logs or Git.
It refuses batches above 2,500 characters, insufficient included quota and
overwriting existing files after text/parameter drift. No automatic retries.
The browser only fetches these local files; it never calls ElevenLabs.
