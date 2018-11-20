#!/usr/bin/env bash
getremote() {
  cd $1
  local_tmp=tmp
  if [ ! "$(git branch | grep ${local_tmp})" == '' ]; then
    git branch -d ${local_tmp}
  fi
  if [ "$(git remote get-url --push origin | grep .git$)" = '' ]; then
    git remote set-url origin $(git remote get-url --push origin | sed 's#https://github.com/#git@github.com:#').git
    git remote get-url --push origin
  fi

  git pull origin ${master}
  git add -A
  git commit -m "[push] by $0"
  git branch ${local_tmp}
  git checkout ${master}
  git merge ${local_tmp}
  git branch -d ${local_tmp}
  git push --recurse-submodules=on-demand origin ${master}

  cd ..
}

current=$(dirname ${0})
loop=$(find ${current} -maxdepth 1 -mindepth 1 -type d | grep -v .git$)
for dir in ${loop}
do
  getremote ${dir}
done
