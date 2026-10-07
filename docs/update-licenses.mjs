/** Refresh declared-license metadata. Review upstream license text separately. */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lockText = readFileSync(resolve(root, 'package-lock.json'), 'utf8')
const lock = JSON.parse(lockText)
const direct = lock.packages['']
const reviewed = new Date().toISOString().slice(0, 10)
const packages = Object.entries(lock.packages)
  .filter(([path]) => path)
  .map(([path, entry]) => {
    const directory = resolve(root, path)
    const installed = existsSync(resolve(directory, 'package.json'))
    const actual = installed
      ? JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'))
      : null
    if (actual && (actual.version !== entry.version || actual.license !== entry.license)) {
      throw new Error(`Installed metadata differs from lockfile: ${path}. Run npm ci and review before proceeding.`)
    }
    const name = actual?.name || path.split('node_modules/').at(-1)
    const licenseFiles = installed
      ? readdirSync(directory).filter(file => /^(licen[sc]e|copying|notice)(\.|$|-)/i.test(file))
      : []
    return {
      name,
      version: entry.version,
      license: actual?.license || entry.license || null,
      scope: direct.dependencies?.[name]
        ? 'direct runtime'
        : direct.devDependencies?.[name]
          ? 'direct development'
          : entry.dev ? 'transitive development' : 'transitive runtime',
      installed,
      optional: Boolean(entry.optional),
      metadataSource: installed
        ? 'installed package.json and package-lock.json'
        : 'package-lock.json (package not installed)',
      licenseFiles: licenseFiles.map(file => `${path}/${file}`),
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))

const inventory = {
  reviewed,
  lockfileSha256: createHash('sha256').update(lockText).digest('hex'),
  notes: [
    'License identifiers are package-declared metadata, not a legal opinion.',
    'Installed top-level license/notice paths are listed; embedded subcomponent notices can also apply.',
    'Optional packages for other platforms may occur only in the lockfile.',
    'Preserve upstream licenses and notices when redistributing dependencies.',
  ],
  packages,
}
writeFileSync(resolve(root, 'docs/dependency-licenses.json'), `${JSON.stringify(inventory, null, 2)}\n`)

const noticePath = resolve(root, 'THIRD_PARTY_NOTICES.md')
const notices = readFileSync(noticePath, 'utf8')
const marker = /<!-- development-dependencies:start -->[\s\S]*?<!-- development-dependencies:end -->/
if (!marker.test(notices)) {
  throw new Error('Development dependency table markers are missing; inventory was written, notices need manual review.')
}
const devTable = [
  '<!-- development-dependencies:start -->',
  '| Package | Version | Declared license |',
  '| --- | --- | --- |',
  ...packages.filter(pkg => pkg.scope === 'direct development')
    .map(pkg => `| ${pkg.name} | ${pkg.version} | ${pkg.license || 'UNKNOWN: review required'} |`),
  '<!-- development-dependencies:end -->',
].join('\n')
writeFileSync(noticePath, notices.replace(marker, devTable))
console.log(`Updated inventory for ${packages.length} locked packages and the direct development dependency table.`)
console.log('Review runtime versions/license text, upstream notices, asset provenance, and the actual build output before committing.')
