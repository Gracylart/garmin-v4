#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
: "${CIQ_SDK_ROOT:?Set CIQ_SDK_ROOT to the installed Connect IQ SDK directory}"
: "${CIQ_DEVELOPER_KEY:?Set CIQ_DEVELOPER_KEY to your private developer_key.der file}"
device="${1:-venu445mm}"
compiler="$CIQ_SDK_ROOT/bin/monkeyc"
[[ -f "$compiler" ]] || { echo "Compiler not found: $compiler" >&2; exit 1; }
[[ -f "$CIQ_DEVELOPER_KEY" ]] || { echo "Developer key not found" >&2; exit 1; }
cd "$project_dir"
npm test
for app in ciq ciq-play; do
  (
    cd "$project_dir/$app"
    mkdir -p bin
    if [[ "$app" == ciq ]]; then output="Emote-$device.prg"; else output="EmotePlay-$device.prg"; fi
    "$compiler" -f monkey.jungle -d "$device" -o "bin/$output" -y "$CIQ_DEVELOPER_KEY" -O 2 -r
  )
done
