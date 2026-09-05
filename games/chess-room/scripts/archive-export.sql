-- Run using authenticated Cloudflare D1 tooling. Save output OUTSIDE this public repository.
-- No user/session/login identifier is exported; group revisions only by archive_key.
SELECT archive_key, variant, mode, revision, moves, result, saved_at
FROM game_archive ORDER BY id;
