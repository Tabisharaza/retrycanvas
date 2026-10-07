import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('ships the project license and accurate bundled runtime notices', () => {
  expect(readFileSync('public/LICENSE.txt', 'utf8')).toBe(readFileSync('LICENSE', 'utf8'))
  const notices = readFileSync('public/THIRD_PARTY_NOTICES.txt', 'utf8')
  for (const name of ['react', 'react-dom', 'scheduler']) {
    const pkg = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')) as { version: string }
    expect(notices).toContain(`${name} ${pkg.version}`)
    expect(notices).toContain(readFileSync(`node_modules/${name}/LICENSE`, 'utf8'))
  }
})
