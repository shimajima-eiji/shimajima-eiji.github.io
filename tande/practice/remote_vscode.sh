pass=meru1326@dom
current=/opt/src

sshpass -p ${pass} ssh localpi "[ -d ${current}/$1 ] & ls ${current}/$1 | touch ${current}/$1"
sshpass -p ${pass} ssh -R 52698:localhost:52698 localpi rmate ${current}/$1
