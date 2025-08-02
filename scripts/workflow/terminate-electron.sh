#!/bin/bash

pkill -f "nextron|next|electron" || true

ps aux | grep -E "(nextron|next|electron)" | grep -v grep || echo "No remaining processes found"