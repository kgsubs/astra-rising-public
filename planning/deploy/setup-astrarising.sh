#!/usr/bin/env bash
# Serve Astra Rising at astrarising.com.
# Run with:  sudo bash /path/to/astra-rising/planning/deploy/setup-astrarising.sh
#
# Idempotent: re-running re-installs the unit and vhost, restarts the service
# and only requests a certificate if one is not already present.

set -uo pipefail

REPO=/path/to/astra-rising
DOMAIN=astrarising.com
PORT=3500
TOTAL=5
START=$(date +%s)

if [ -t 1 ]; then GREEN=$'\033[32m'; RED=$'\033[31m'; DIM=$'\033[2m'; OFF=$'\033[0m'
else GREEN=''; RED=''; DIM=''; OFF=''; fi

step()  { printf '[%d/%d] starting: %s\n' "$1" "$TOTAL" "$2"; }
ok()    { printf '[%d/%d] %s[OK]%s   %s\n' "$1" "$TOTAL" "$GREEN" "$OFF" "$2"; }
fail()  { printf '[%d/%d] %s[FAIL]%s %s\n' "$1" "$TOTAL" "$RED" "$OFF" "$2"; exit 1; }
note()  { printf '      %s%s%s\n' "$DIM" "$1" "$OFF"; }

# Elapsed-seconds ticker on stderr for the slow steps.
ticker() {
  local label=$1 t=0
  while :; do printf '\r      %s %ss ' "$label" "$t" >&2; sleep 1; t=$((t+1)); done
}
start_ticker() { ticker "$1" & TICKER_PID=$!; }
stop_ticker()  { [ -n "${TICKER_PID:-}" ] && kill "$TICKER_PID" 2>/dev/null; printf '\r%*s\r' 40 '' >&2; TICKER_PID=; }
trap stop_ticker EXIT

[ "$(id -u)" -eq 0 ] || fail 0 "must run as root (use sudo)"

# ── 1. systemd unit ──────────────────────────────────────────────────────────
step 1 "install systemd unit astra.service"
install -m 644 "$REPO/planning/deploy/astra.service" /etc/systemd/system/astra.service || fail 1 "could not install unit"
systemctl daemon-reload || fail 1 "daemon-reload failed"
ok 1 "unit installed"

# ── 2. service ───────────────────────────────────────────────────────────────
step 2 "start astra service on port $PORT"
systemctl enable astra >/dev/null 2>&1
systemctl restart astra || fail 2 "service failed to start (journalctl -u astra -n 50)"
start_ticker "waiting for health check"
HEALTH=""
for _ in $(seq 1 20); do
  HEALTH=$(curl -fsS "http://127.0.0.1:$PORT/api/healthz" 2>/dev/null) && break
  sleep 1
done
stop_ticker
[ -n "$HEALTH" ] || fail 2 "no health response from 127.0.0.1:$PORT (journalctl -u astra -n 50)"
ok 2 "service up: $HEALTH"

# ── 3. nginx vhost ───────────────────────────────────────────────────────────
step 3 "install nginx vhost for $DOMAIN"
if [ -f "/etc/nginx/sites-available/$DOMAIN.conf" ] && grep -q "managed by Certbot" "/etc/nginx/sites-available/$DOMAIN.conf"; then
  note "existing vhost already has certbot's TLS block - leaving it in place"
else
  install -m 644 "$REPO/planning/deploy/$DOMAIN.conf" "/etc/nginx/sites-available/$DOMAIN.conf" || fail 3 "could not write vhost"
fi
ln -sfn "/etc/nginx/sites-available/$DOMAIN.conf" "/etc/nginx/sites-enabled/$DOMAIN.conf"
nginx -t >/dev/null 2>&1 || { nginx -t; fail 3 "nginx config test failed"; }
systemctl reload nginx || fail 3 "nginx reload failed"
ok 3 "vhost enabled and nginx reloaded"

# ── 4. TLS ───────────────────────────────────────────────────────────────────
step 4 "obtain TLS certificate"
MY_IP=$(curl -fsS -4 ifconfig.me 2>/dev/null)
# Ask the authoritative nameserver, not the local resolver: right after a DNS
# change the cache still holds the old address for the rest of its TTL, while
# Let's Encrypt resolves fresh and would validate fine.
AUTH_NS=$(dig +short NS "$DOMAIN" | head -1)
DNS_IP=$(dig +short ${AUTH_NS:+@"$AUTH_NS"} "$DOMAIN" A | tail -1)
[ -n "$DNS_IP" ] || DNS_IP=$(dig +short "$DOMAIN" A | tail -1)
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  ok 4 "certificate already present - skipping certbot"
elif [ "$DNS_IP" != "$MY_IP" ]; then
  note "DNS for $DOMAIN points at ${DNS_IP:-nothing}, this host is $MY_IP"
  note "point the A record here, then re-run this script to get the certificate"
  ok 4 "skipped (DNS not pointed here yet) - site is live over plain HTTP"
else
  start_ticker "certbot"
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect --non-interactive --agree-tos --register-unsafely-without-email >/tmp/astra-certbot.log 2>&1
  RC=$?
  stop_ticker
  [ $RC -eq 0 ] || { tail -20 /tmp/astra-certbot.log; fail 4 "certbot failed (full log: /tmp/astra-certbot.log)"; }
  systemctl reload nginx
  ok 4 "certificate issued and HTTPS redirect enabled"
fi

# ── 5. verify ────────────────────────────────────────────────────────────────
step 5 "verify the site answers"
CODE=$(curl -fsS -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" "http://127.0.0.1/" 2>/dev/null)
case "$CODE" in
  200|301|302) ok 5 "nginx answered $CODE for $DOMAIN" ;;
  *) fail 5 "unexpected response $CODE from nginx" ;;
esac

printf '\nDone in %ss. Service: systemctl status astra | Logs: journalctl -u astra -f\n' "$(( $(date +%s) - START ))"
