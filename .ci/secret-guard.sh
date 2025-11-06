#!/usr/bin/env bash
set -euo pipefail
pat='(-----BEGIN[[:space:]](PRIVATE|OPENSSH)|PRIVATE[[:space:]]KEY|AWS_SECRET_ACCESS_KEY|xox[baprs]-[0-9A-Za-z-]{10,}|ghp_[0-9A-Za-z]{36,}|eyJhbGciOi|api[_-]?key[[:space:]]*[:=]|secret[[:space:]]*[:=])'
bad=0

while read -r file; do
  [ -f "$file" ] || continue
  case "$file" in
    *.p8|*.pem|*.key|*/id_rsa|*/id_ed25519) echo "::error file=$file::secret-like filename blocked"; bad=1; continue;;
  esac
  if grep -E -I -n "$pat" "$file" >/dev/null 2>&1; then
    echo "::error file=$file::secret-like content blocked"; bad=1
  fi
done < <(git ls-files)

# blob size guard
while read -r oid size path; do
  mb=$(( (size+1048575)/1048576 ))
  if [ $mb -ge 10 ]; then
    echo "::error file=$path::file ${mb}MB exceeds 10MB limit"
    bad=1
  fi
done < <(git ls-tree -r -l HEAD | awk '{print $3" "$4" "$5}')

exit $bad
