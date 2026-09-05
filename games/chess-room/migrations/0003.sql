-- Legacy records retain their original 90-day policy until explicitly resumed under archive-v1.
ALTER TABLE games ADD COLUMN archive_policy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN archive_key TEXT;
CREATE TABLE game_archive (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
 archive_key TEXT NOT NULL,
 variant TEXT NOT NULL,
 mode TEXT NOT NULL,
 revision INTEGER NOT NULL,
 moves TEXT NOT NULL,
 result TEXT,
 saved_at INTEGER NOT NULL,
 UNIQUE(archive_key, revision)
);
CREATE INDEX game_archive_game ON game_archive(game_id);
CREATE TRIGGER archive_game_insert AFTER INSERT ON games WHEN NEW.archive_policy=1 BEGIN
 INSERT INTO game_archive(game_id,archive_key,variant,mode,revision,moves,result,saved_at)
 VALUES(NEW.id,NEW.archive_key,NEW.variant,NEW.mode,NEW.revision,NEW.moves,NEW.result,NEW.updated_at);
END;
CREATE TRIGGER archive_game_update AFTER UPDATE OF moves ON games WHEN NEW.archive_policy=1 BEGIN
 INSERT INTO game_archive(game_id,archive_key,variant,mode,revision,moves,result,saved_at)
 VALUES(NEW.id,NEW.archive_key,NEW.variant,NEW.mode,NEW.revision,NEW.moves,NEW.result,NEW.updated_at);
END;
