git submodule foreach git add -A
git submodule foreach git commit -m "${push} by $0 from githubpage repository"
git push --recurse-submodules=on-demand origin master
git add -A
git commit -m "[push] by $0"

