# Ollie: Australia → New York story quest

Approved: six tablet-friendly gaps, fully voiced Charlie/Australian narration,
humorous correct-answer transitions, once-only New York souvenir +50 coins +80 XP.
English learning content remains English in both interface languages.

1. Private story source `content/quests/ollie-roadtrip.json`; answers and future
   replies never bundled into production client. RPC exposes only current question,
   then hint on error or acknowledgement after success. Local audio filenames for
   unrevealed replies are opaque; no public answer/text manifest.
2. Migration 0055: private question/progress tables with RLS and pupil-only RPCs;
   row lock, ordered answers, persisted resume, atomic ledger/XP/item grant once.
   Reuse grant_xp/progress_result, normal inventory and existing item kinds.
   No live migration, commit or push requested for this new quest.
3. Story modal from Ollie's shop dialogue, large answer tiles, replay, error/retry,
   Continue after voiced acknowledgement, progress6, once-only reward/completed state.
   Reuse portrait motion and shared NPC voice arbitration. Close/mute/hide cancel audio.
4. Own low-poly New York postcard souvenir with GLB/LOD, ordinary deco slot,
   inventory-only, no shop price/category additions or paid model generation.
5. Generate bounded offline Charlie clips for intro,6 questions,6 replies and error.
   No live TTS/key in client; API quota checked, no overage, no auto-regeneration.
6. SQL security/replay/order/once-only grant tests, API/UI failure/lifecycle tests,
   real browser story run with local audio and screenshots, full tests/build.

Contracts: StoryState {id,completed,step,total,question:null|{id,position,narrative,clip,options},
reward:{itemId,coins,xp},coins}; StoryAnswer {correct,alreadySolved,hint,
feedback:null|{text,clip},state,awarded:{coins,xp,itemId:null|string},progress:null|ProgressDelta}.
Clip values are opaque filenames inside assets/shopkeeper/story-voice, without extension.

Completed locally: 1,308 tests, 17 shop/story browser tests, build and migrations
check passed. Reviewer found question-ID leakage (fixed with gap-1..gap-6),
uncertain-completion refresh (fixed) and lost replay after a wrong answer
(fixed and regression-tested). 14 real clips decode successfully (116.38 s).
Souvenir delivered as own 408-triangle/one-material GLB +far model. No commit,
push or live migration. Teacher/user review remains before later release.
