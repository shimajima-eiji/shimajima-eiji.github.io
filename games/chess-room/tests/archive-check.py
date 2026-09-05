"""Real SQLite trigger / retention / unlinking invariants; no user data."""
import sqlite3
from pathlib import Path
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON')
for path in sorted(Path('migrations').glob('*.sql')):c.executescript(path.read_text())
c.execute("INSERT INTO players VALUES('p',NULL,0)")
def game(id,policy):
 c.execute("INSERT INTO games(id,player_id,mode,created_at,updated_at,archive_policy,archive_key) VALUES(?,'p','computer',0,0,?,?)",(id,policy,'archive-'+id))
game('old',0);game('new',1)
assert c.execute('SELECT COUNT(*) FROM game_archive').fetchone()[0]==1
for revision,moves in [(1,'["e4"]'),(2,'["e4","e5"]'),(3,'["e4"]')]:
 c.execute('UPDATE games SET moves=?,revision=? WHERE id=\'new\'',(moves,revision))
assert c.execute('SELECT moves FROM game_archive ORDER BY revision').fetchall()==[('[]',),('["e4"]',),('["e4","e5"]',),('["e4"]',)]
# A failed optimistic update cannot create an archive revision.
c.execute("UPDATE games SET moves='[]',revision=4 WHERE id='new' AND revision=2")
assert c.execute('SELECT COUNT(*) FROM game_archive').fetchone()[0]==4
c.execute('DELETE FROM games WHERE archive_policy=0 AND updated_at<100')
assert c.execute('SELECT id FROM games').fetchall()==[('new',)]
# Both history deletion and account cascade keep snapshots but remove the only user join.
c.execute("DELETE FROM games WHERE player_id='p'")
assert c.execute('SELECT COUNT(*) FROM game_archive WHERE game_id IS NULL').fetchone()[0]==4
game('other',1);c.execute("DELETE FROM players WHERE id='p'")
assert c.execute('SELECT COUNT(*) FROM game_archive WHERE game_id IS NULL').fetchone()[0]==5
assert c.execute('SELECT COUNT(*) FROM games').fetchone()[0]==0
assert not {'player_id','login_hash','ip','session_id'} & {r[1] for r in c.execute('PRAGMA table_info(game_archive)')}
print('PASS: initial/unfinished/undo snapshots, revision conflicts, legacy expiry, indefinite retention, history/account unlinking')
