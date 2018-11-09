# !/bin/sh
# Recommend: /bin/bash

__common() {
  ### develop
  dev() {
    search $2
  }

  ### functions
  help() {
    cat <<HELP
# Using
$ __common (function) (server) (command[1..@])

## function
- ssh
- scp:
  - get
  - get_r
  - send
  - send_r

## server
- proxy
- hadoop
- vulinfo

...more

## command
need 1

## e.g.
sh $0 ssh localhost ifconfig


# needed integration
sshpass
yes


HELP
  }

  filter() {
    function=$1
    iphost=$2
    
    # cmd in common functions
    return_flg=true
    case "${function}" in
      "ssh") return_flg=false;;
      "scp_get") return_flg=false;;
      "scp_get_r") return_flg=false;;
      "scp_send") return_flg=false;;
      "scp_send_r") return_flg=false;;
    esac

    if [ $# -lt 3 ] ; then
      return_flg=true
    elif [ "${iphost}" = '' ] ; then
      return_flg=true
    fi
    echo $return_flg
  }

  search() {
    target=".$1"
    echo ${get} | jq "select($target)" | jq ${target} | tr -d '"'
  }

  ssh() {
    cmd="$@"
    yes ${pass} | sshpass -p ${pass} ssh -p ${port} ${user}@${iphost} "sudo -S ${cmd}" 2>/dev/null
  }

  scp_get() {
    infile=$1
    outfile=${current}/$2
    ssh="sshpass -p ${pass} ssh -p ${port} ${user}@${iphost}"

    yes ${pass} | ${ssh} "sudo -S dd if=${infile}" 2>/dev/null | dd of=${outfile} 2>/dev/null
  }
  scp_get_r() {
    infile=$1
    outfile=${current}/$2
    sshpass -p ${pass} scp -P ${port} -r ${user}@${iphost}:${infile} ${outfile}
  }

  scp_send() {
    infile=${current}/$1
    outfile=$2
    sshpass -p ${pass} scp -P ${port} -r ${infile} ${user}@${iphost}:${outfile}
  }
  scp_send_r() {
    scp_send $1 $2
  }

  ### initialize
  current=$(pwd)
  cd $(dirname $0)
  get=$(cat ./ssh.yaml | yq '.')

  user=$(search default.user)
  pass=$(search default.pass)

  function=$1
  serv=${2:-null}
  cmd=$(echo $@ | cut -f3- -d' ')

  ### filter
  iphost=$(search server.${serv}.iphost)
  port=$(search server.${serv}.port)

  if [ "$1" = 'dev' ] ; then  # for develop and debug
    dev $@
    return
  elif [ "$(filter ${function} ${iphost} ${cmd})" = 'true' ] ; then
    help
    return
  fi

  ### main
  ${function} ${cmd}
}

__common $@
