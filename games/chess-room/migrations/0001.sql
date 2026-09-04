PRAGMA foreign_keys = ON;
CREATE TABLE players (id TEXT PRIMARY KEY, login_hash TEXT UNIQUE, created_at INTEGER NOT NULL);
CREATE TABLE sessions (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_player ON sessions(player_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE games (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, mode TEXT NOT NULL CHECK(mode IN ('computer','local')), moves TEXT NOT NULL DEFAULT '[]', observations TEXT NOT NULL DEFAULT '[]', revision INTEGER NOT NULL DEFAULT 0, result TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX games_player_updated ON games(player_id,updated_at);
