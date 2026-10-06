#!/usr/bin/env bash
# Packs this package together with the workspace `@solana/web3.js` and installs both with npm into a
# fresh app. This proves two things at once: that the declared peer ranges resolve the way a consumer's
# `npm install` would, and that they resolve against the web3.js in this tree rather than the copy
# already published to the registry.
set -euo pipefail
cd "$(dirname "$0")/.."
app=$(mktemp -d)
trap 'rm -rf "$app"' EXIT
tarball=$(pnpm pack --pack-destination "$app" | tail -1)
web3js=$(cd ../web3.js && pnpm pack --pack-destination "$app" | tail -1)
cd "$app"
npm init -y >/dev/null
peer() { node -p "require('$OLDPWD/package.json').peerDependencies['$1']"; }
npm install --no-audit --no-fund "$tarball" "$web3js" "@solana/kit@$(peer @solana/kit)" react@19.3.0 react-dom@19.3.0 >/dev/null
node --input-type=module -e "
import { WalletProvider, useWallet, WalletMultiButton } from '@solana/wallet-adapter';
import { createWalletController } from '@solana/wallet-adapter/core';
await import('@solana/kit-plugin-wallet');
if (![WalletProvider, useWallet, WalletMultiButton, createWalletController].every(v => typeof v === 'function')) process.exit(1);
console.log('installed and importable');
"
