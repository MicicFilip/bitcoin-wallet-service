#!/bin/sh
/usr/bin/curl -H "Content-Type: application/json" -d "{\"block_hash\": \"$@\"}" "http://127.0.0.1:3000/api/bitcoin/blocknotify/"