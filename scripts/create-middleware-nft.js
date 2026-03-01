/**
 * Vercel's @vercel/next builder reads `.next/server/middleware.js.nft.json`
 * to resolve middleware dependencies. Next.js 15.x with src/ layout compiles
 * middleware to `.next/server/src/middleware.js` (not the root path Vercel
 * expects), and edge functions do not emit NFT files at all.
 *
 * This script runs after `next build` and creates the file Vercel needs,
 * pointing to the actual compiled edge bundle.
 */

const fs = require('fs')
const path = require('path')

const SERVER_DIR = path.join('.next', 'server')
const MANIFEST_PATH = path.join(SERVER_DIR, 'middleware-manifest.json')
const NFT_PATH = path.join(SERVER_DIR, 'middleware.js.nft.json')

if (!fs.existsSync(MANIFEST_PATH)) {
  console.log('[postbuild] No middleware-manifest.json found — skipping.')
  process.exit(0)
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
const entry = manifest.middleware?.['/']

if (!entry) {
  console.log('[postbuild] No middleware entry in manifest — skipping.')
  process.exit(0)
}

// Manifest paths are relative to .next/ (e.g. "server/src/middleware.js").
// NFT paths must be relative to .next/server/ (strip the "server/" prefix).
const files = (entry.files || []).map((f) =>
  f.startsWith('server/') ? f.slice('server/'.length) : f
)

fs.writeFileSync(NFT_PATH, JSON.stringify({ version: 1, files }))
console.log('[postbuild] Created middleware.js.nft.json →', files)
