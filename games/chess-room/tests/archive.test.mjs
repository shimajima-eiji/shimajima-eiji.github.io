import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
test('archive retention and unlinking with actual SQLite triggers',()=>{execFileSync('python3',['tests/archive-check.py'],{stdio:'pipe'});});
