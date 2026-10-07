import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('renders real charts, valid default counts, and no horizontal overflow', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Same retries. Different rhythm.' })).toBeVisible()
  await expect(page.getByText('600', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: /retry histogram$/i })).toHaveCount(3)
  await expect(page.getByRole('status')).toHaveText('Default comparison ready.')
  await expect(page.getByText('Synthetic retry-schedule simulation.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await testInfo.attach('default-comparison', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
})

test('invalid inputs keep the last valid comparison and reset recovers repeatedly', async ({ page }) => {
  await page.goto('./')
  const clients = page.getByRole('spinbutton', { name: 'Clients', exact: true })
  await clients.fill('0')
  await page.getByRole('button', { name: 'Run comparison' }).click()
  await expect(clients).toHaveAttribute('aria-invalid', 'true')
  await expect(clients).toBeFocused()
  await expect(page.getByRole('status')).toContainText('last valid comparison')
  await expect(page.getByText('600', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reset defaults' }).click()
  await expect(clients).toHaveValue('100')
  await expect(clients).toHaveAttribute('aria-invalid', 'false')
  await page.getByRole('spinbutton', { name: 'Histogram bin width' }).fill('1')
  await page.getByRole('button', { name: 'Run comparison' }).click()
  await expect(page.getByText(/needs a bin width of at least 3 ms/)).toBeVisible()
  await page.getByRole('button', { name: 'Reset defaults' }).click()
  await page.getByRole('button', { name: 'Reset defaults' }).click()
  await expect(page.getByRole('spinbutton', { name: 'Histogram bin width' })).toHaveValue('100')
  await expect(page.getByRole('status')).toContainText('Defaults restored')
})

test('keyboard submission, seeded reruns and repeated CSV exports use displayed results', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('spinbutton', { name: 'Clients', exact: true }).fill('3')
  await page.getByRole('spinbutton', { name: 'Retries per client' }).fill('2')
  await page.getByRole('spinbutton', { name: 'Random seed' }).fill('99')
  await page.getByRole('spinbutton', { name: 'Random seed' }).press('Enter')
  await expect(page.getByRole('status')).toContainText('3 clients, 2 retries each, seed 99')
  const firstCharts = await page.locator('.timeline path').evaluateAll(paths => paths.map(path => path.getAttribute('d')))
  await page.getByRole('button', { name: 'Run comparison' }).click()
  expect(await page.locator('.timeline path').evaluateAll(paths => paths.map(path => path.getAttribute('d')))).toEqual(firstCharts)
  // Unapplied inputs must never silently change the export.
  await page.getByRole('spinbutton', { name: 'Clients', exact: true }).fill('9')
  const csvs: string[] = []
  for (let i = 0; i < 2; i++) {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export CSV' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('retrycanvas-seed-99.csv')
    const path = await download.path()
    csvs.push(await readFile(path!, 'utf8'))
  }
  expect(csvs[0]).toBe(csvs[1])
  expect(csvs[0].trim().split('\r\n')).toHaveLength(19)
  await expect(page.getByRole('status')).toContainText('18 retry rows')
})

test('empty inputs are rejected and a valid edit clears validation', async ({ page }) => {
  await page.goto('./')
  const seed = page.getByRole('spinbutton', { name: 'Random seed' })
  await seed.fill('')
  await page.getByRole('button', { name: 'Run comparison' }).click()
  await expect(seed).toHaveAttribute('aria-invalid', 'true')
  await seed.fill('0')
  await seed.press('Enter')
  await expect(seed).toHaveAttribute('aria-invalid', 'false')
  await expect(page.getByRole('status')).toContainText('seed 0')
})

test('maximum workload in a single bin preserves full counts and legible chart gutters', async ({ page }, testInfo) => {
  await page.goto('./')
  for (const [label, value] of [
    ['Clients', '500'], ['Retries per client', '12'], ['Base delay', '1'],
    ['Delay cap', '1'], ['Random seed', '4294967295'], ['Histogram bin width', '60000'],
  ]) await page.getByRole('spinbutton', { name: label, exact: true }).fill(value)
  await page.getByRole('button', { name: 'Run comparison' }).click()
  await expect(page.getByRole('status')).toContainText('500 clients, 12 retries each')
  expect(await page.locator('.peak-stat strong').allTextContents()).toEqual(['6,000', '6,000', '6,000'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const ticksFit = await page.locator('.histogram text').evaluateAll(labels => labels.every(label => {
    const bounds = (label as SVGGraphicsElement).getBBox()
    return bounds.x >= 0 && bounds.x + bounds.width <= 320
  }))
  expect(ticksFit).toBe(true)
  await testInfo.attach('maximum-workload-comparison', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
})
