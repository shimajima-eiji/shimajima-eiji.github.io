ALTER TABLE games ADD COLUMN variant TEXT NOT NULL DEFAULT 'chess' CHECK(variant IN ('chess','dai'));
CREATE INDEX games_player_variant_updated ON games(player_id,variant,updated_at);
