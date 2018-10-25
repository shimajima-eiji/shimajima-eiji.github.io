#git submodule foreach git add -A
git add -A
git commit -m "[push] by $0"
git push --recurse-submodules=on-demand

