#!/usr/bin/env bash
# Enable gzip for proxied JS/CSS/JSON on astrarising.com.
# Run: sudo bash /path/to/astra-rising/planning/enable-gzip.sh
set -u

CONF=/etc/nginx/nginx.conf
BAK="/etc/nginx/nginx.conf.bak-$(date +%Y%m%d-%H%M%S)"
T0=$(date +%s)

step() { echo "[$1/4] $2"; }
ok()   { echo "[$1/4] [OK] $2"; }
fail() { echo "[$1/4] [FAIL] $2"; exit 1; }

step 1 "Backing up $CONF"
cp "$CONF" "$BAK" || fail 1 "backup"
ok 1 "backup -> $BAK"

step 2 "Uncommenting gzip directives"
sed -i 's/^\(\s*\)# \(gzip_[a-z_]* .*\)$/\1\2/' "$CONF" || fail 2 "sed edit"
grep -q '^\s*gzip_proxied any;' "$CONF" || fail 2 "gzip_proxied not active after edit"
grep -q '^\s*gzip_types .*application\/javascript' "$CONF" || fail 2 "gzip_types not active after edit"
ok 2 "gzip_vary, gzip_proxied, gzip_comp_level, gzip_buffers, gzip_http_version, gzip_types active"

step 3 "Validating nginx config"
if nginx -t 2>&1; then
  ok 3 "config valid"
else
  cp "$BAK" "$CONF"
  fail 3 "nginx -t failed, restored backup"
fi

step 4 "Reloading nginx"
systemctl reload nginx || fail 4 "reload"
ok 4 "reloaded"

echo "Verifying compression on live site..."
ENC=$(curl -so /dev/null -w '%{size_download}' -H 'Accept-Encoding: gzip' https://astrarising.com/vendor/lucide-react.js)
echo "lucide-react.js over the wire: ${ENC} bytes (was 738143 uncompressed)"
echo "Done in $(( $(date +%s) - T0 ))s"
