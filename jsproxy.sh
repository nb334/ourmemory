#!/usr/bin/env bash

{ # this ensures the entire script is downloaded #

JSPROXY_VER=0.1.0
OPENRESTY_VER=1.15.8.1

SRC_URL=https://raw.githubusercontent.com/EtherDream/jsproxy/$JSPROXY_VER
BIN_URL=https://raw.githubusercontent.com/EtherDream/jsproxy-bin/master
ZIP_URL=https://codeload.github.com/EtherDream/jsproxy/tar.gz

SUPPORTED_OS="Linux-x86_64"
OS="$(uname)-$(uname -m)"
USER=$(whoami)

INSTALL_DIR=/home/jsproxy
NGX_DIR=$INSTALL_DIR/openresty

DOMAIN_SUFFIX=(
  xip.io
  nip.io
  sslip.io
)

GET_IP_API=(
  https://api.ipify.org
  https://bot.whatismyipaddress.com/
)

COLOR_RESET="\033[0m"
COLOR_RED="\033[31m"
COLOR_GREEN="\033[32m"
COLOR_YELLOW="\033[33m"

output() {
  local color=$1
  shift 1
  local sdata=$@
  local stime=$(date "+%H:%M:%S")
  printf "$color[jsproxy $stime]$COLOR_RESET $sdata\n"
}
log() {
  output $COLOR_GREEN $1
}
warn() {
  output $COLOR_YELLOW $1
}
err() {
  output $COLOR_RED $1
}

gen_cert() {
  local ip=""

  for i in ${GET_IP_API[@]}; do
    log "服务器公网 IP 获取中，通过接口 $i"
    ip=$(curl -s $i)

    if [[ ! $ip ]]; then
      warn "获取失败"
      continue
    fi

    if ! grep -qP "^\d+\.\d+\.\d+\.\d+$" <<< $ip; then
      warn "无效 IP：$ip"
      continue
    fi

    break
  done

  if [[ $ip ]]; then
    log "服务器公网 IP: $ip"
  else
    err "服务器公网 IP 获取失败，无法申请证书"
    exit 1
  fi

  log "安装 acme.sh 脚本 ..."
  curl https://get.acme.sh | sh -s email=my@example.com

  local acme=~/.acme.sh/acme.sh

  local domains=()

  if [[ $@ ]]; then
    for i in $@; do
      domains+=($i)
    done
  else
    warn "未指定域名，使用公共测试域名"
    for i in ${DOMAIN_SUFFIX[@]}; do
      domains+=($ip.$i)
    done
  fi

  for domain in ${domains[@]}; do
    echo "校验域名 $domain ..."

    local ret=$(getent ahosts $domain | head -n1 | awk '{print $1}')
    if [[ $ret != $ip ]]; then
      err "域名 $domain 解析结果: $ret，非本机公网 IP: $ip"
      continue
    fi

    log "尝试为域名 $domain 申请证书 ..."

    local dist=server/cert/$domain
    mkdir -p $dist

    $acme \
      --issue \
      -d $domain \
      --keylength ec-256 \
      --webroot server/acme

    $acme \
      --install-cert \
      -d $domain \
      --ecc \
      --key-file $dist/ecc.key \
      --fullchain-file $dist/ecc.cer

    if [ -s $dist/ecc.key ] && [ -s $dist/ecc.cer ]; then
      echo "# generated by i.sh
listen                8443 ssl http2;
ssl_certificate       cert/$domain/ecc.cer;
ssl_certificate_key   cert/$domain/ecc.key;
" > server/cert/cert.conf

      local url=https://$domain:8443
      echo "
$url  'mysite';" >> server/allowed-sites.conf

      log "证书申请完成，重启服务 ..."
      server/run.sh reload

      log "在线预览: $url"
      break
    fi

    err "证书申请失败！（80 端口是否添加到防火墙）"
    rm -rf $dist
  done
}


install() {
  cd $INSTALL_DIR

  log "下载 nginx 程序 ..."
  curl -O $BIN_URL/$OS/openresty-$OPENRESTY_VER.tar.gz
  tar zxf openresty-$OPENRESTY_VER.tar.gz
  rm -f openresty-$OPENRESTY_VER.tar.gz

  local ngx_exe=$NGX_DIR/nginx/sbin/nginx
  local ngx_ver=$($ngx_exe -v 2>&1)

  if [[ "$ngx_ver" != *"nginx version:"* ]]; then
    err "$ngx_exe 无法执行！尝试编译安装"
    exit 1
  fi
  log "$ngx_ver"
  log "nginx path: $NGX_DIR"

  log "下载代理服务 ..."
  curl -o jsproxy.tar.gz $ZIP_URL/$JSPROXY_VER
  tar zxf jsproxy.tar.gz
  rm -f jsproxy.tar.gz

  log "下载静态资源 ..."
  curl -o www.tar.gz $ZIP_URL/gh-pages
  tar zxf www.tar.gz -C jsproxy-$JSPROXY_VER/www --strip-components=1
  rm -f www.tar.gz

  if [ -x server/run.sh ]; then
    warn "尝试停止当前服务 ..."
    server/run.sh quit
  fi

  if [ -d server ]; then
    local backup="$INSTALL_DIR/bak/$(date +%Y_%m_%d_%H_%M_%S)"
    warn "当前 server 目录备份到 $backup"
    mkdir -p $backup
    mv server $backup
  fi

  mv jsproxy-$JSPROXY_VER server

  log "启动服务 ..."
  server/run.sh

  log "服务已开启"
  
  shift 1
  gen_cert $@
}

main() {
  log "自动安装脚本开始执行"

  if [[ "$SUPPORTED_OS" != *"$OS"* ]]; then
    err "当前系统 $OS 不支持自动安装。尝试编译安装"
    exit 1
  fi

  if [[ "$USER" != "root" ]]; then
    err "自动安装需要 root 权限。如果无法使用 root，尝试编译安装"
    exit 1
  fi

  local cmd
  if [[ $0 == *"i.sh" ]]; then
    warn "本地调试模式"

    local dst=/home/jsproxy/i.sh
    cp $0 $dst
    chown jsproxy:nobody $dst
    if [[ $1 == "-s" ]]; then
      shift 1
    fi
    cmd="bash $dst install $@"
  else
    cmd="curl -s $SRC_URL/i.sh | bash -s install $@"
  fi

  iptables \
    -t nat \
    -I PREROUTING 1 \
    -p tcp --dport 80 \
    -j REDIRECT \
    --to-ports 8080

  if ! id -u jsproxy > /dev/null 2>&1 ; then
    log "创建用户 jsproxy ..."
    groupadd nobody > /dev/null 2>&1
    useradd jsproxy -g nobody --create-home
  fi

  log "切换到 jsproxy 用户，执行安装脚本 ..."
  su - jsproxy -c "$cmd"

  local line=$(iptables -t nat -nL --line-numbers | grep "tcp dpt:80 redir ports 8080")
  iptables -t nat -D PREROUTING ${line%% *}

  log "安装完成。后续维护参考 https://github.com/EtherDream/jsproxy"
}


if [[ $1 == "install" ]]; then
  install $@
else
  main $@
fi

} # this ensures the entire script is downloaded #
