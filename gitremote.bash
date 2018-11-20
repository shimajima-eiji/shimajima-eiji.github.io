#!/usr/bin/env bash
getremote() {
  cd $1
  local_tmp=$2

  if [ ! "$(git branch | grep ${local_tmp})" == '' ]; then
    git branch -d ${local_tmp}
  fi
  if [ "$(git remote get-url --push origin | grep .git$)" = '' ]; then
    git remote set-url origin $(git remote get-url --push origin | sed 's#https://github.com/#git@github.com:#').git
    git remote get-url --push origin
  fi
  cd ..
}

local_tmp="${1:-tmp}"
current=$(dirname ${0})
loop=$(find ${current} -maxdepth 1 -mindepth 1 -type d | grep -v .git$)
for dir in ${loop}
do
  getremote ${dir} ${local_tmp} ${remote_push} ${commit_message}
done
