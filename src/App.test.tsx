// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

beforeEach(() => {
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:retrycanvas-test')
    static revokeObjectURL = vi.fn()
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('comparison form and results', () => {
  it('renders complete default results and named, described charts', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Same retries. Different rhythm.' })).toBeTruthy()
    expect(screen.getByRole('spinbutton', { name: 'Clients' }).getAttribute('value')).toBe('100')
    expect(screen.getAllByRole('img', { name: /retry histogram$/i })).toHaveLength(3)
    const noJitter = screen.getByRole('article', { name: 'No jitter results' })
    expect(within(noJitter).getByText('100')).toBeTruthy()
    expect(within(noJitter).getByText('850 ms')).toBeTruthy()
    expect(within(noJitter).getByText('5.1 s')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Default comparison ready.')
    const laneLabels = document.querySelectorAll('.timeline .lane-label')
    expect([...laneLabels].map(label => label.textContent)).toEqual(['1', '2', '3'])
    laneLabels.forEach(label => expect(label.hasAttribute('transform')).toBe(false))
  })
  it('rejects blank, fractional, and out-of-bounds values while keeping the previous result', async () => {
    const user = userEvent.setup()
    render(<App />)
    const clients = screen.getByRole('spinbutton', { name: 'Clients' })
    for (const value of ['', '0', '1.5', '501']) {
      fireEvent.change(clients, { target: { value } })
      await user.click(screen.getByRole('button', { name: 'Run comparison' }))
      expect(clients.getAttribute('aria-invalid')).toBe('true')
      expect(document.activeElement).toBe(clients)
      expect(screen.getByRole('status').textContent).toContain('last valid comparison')
      expect(screen.getByText('600')).toBeTruthy()
    }
  })
  it('rejects unsafe derived bin counts and focuses the associated field', async () => {
    const user = userEvent.setup()
    render(<App />)
    const bin = screen.getByRole('spinbutton', { name: 'Histogram bin width' })
    fireEvent.change(bin, { target: { value: '1' } })
    await user.click(screen.getByRole('button', { name: 'Run comparison' }))
    expect(bin.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(bin)
    expect(screen.getByText(/needs a bin width of at least 3 ms/)).toBeTruthy()
  })
  it('applies changes only on submission and supports keyboard reruns and repeated resets', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const clients = screen.getByRole('spinbutton', { name: 'Clients' })
    await user.clear(clients)
    await user.type(clients, '3')
    expect(screen.getByText('Inputs changed. Run to apply.')).toBeTruthy()
    expect(screen.getByText('600')).toBeTruthy()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status').textContent).toContain('3 clients, 6 retries each, seed 42')
    const paths = [...container.querySelectorAll('.timeline path')].map(path => path.getAttribute('d'))
    await user.click(screen.getByRole('button', { name: 'Run comparison' }))
    expect([...container.querySelectorAll('.timeline path')].map(path => path.getAttribute('d'))).toEqual(paths)
    await user.click(screen.getByRole('button', { name: 'Reset defaults' }))
    await user.click(screen.getByRole('button', { name: 'Reset defaults' }))
    expect((clients as HTMLInputElement).value).toBe('100')
    expect(screen.getByRole('status').textContent).toContain('Defaults restored')
    expect(clients.getAttribute('aria-invalid')).toBe('false')
  })
  it('repeatedly exports the last applied config without letting dirty fields change it', async () => {
    const user = userEvent.setup()
    const clicked: { filename: string; href: string }[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ filename: this.download, href: this.href })
    })
    render(<App />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Clients' }), { target: { value: '3' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Retries per client' }), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Random seed' }), { target: { value: '99' } })
    await user.click(screen.getByRole('button', { name: 'Run comparison' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Clients' }), { target: { value: '50' } })
    for (let i = 0; i < 2; i++) await user.click(screen.getByRole('button', { name: 'Export CSV' }))
    expect(clicked).toEqual(Array(2).fill({ filename: 'retrycanvas-seed-99.csv', href: 'blob:retrycanvas-test' }))
    expect(screen.getByRole('status').textContent).toContain('18 retry rows')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2)
    const exported = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(exported)
    })
    expect(text.trim().split('\r\n')).toHaveLength(19)
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })
  it('recovers from errors with a valid seed-zero submission and starts fresh on remount', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    const seed = screen.getByRole('spinbutton', { name: 'Random seed' })
    fireEvent.change(seed, { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Run comparison' }))
    fireEvent.change(seed, { target: { value: '0' } })
    await user.click(screen.getByRole('button', { name: 'Run comparison' }))
    expect(seed.getAttribute('aria-invalid')).toBe('false')
    expect(screen.getByRole('status').textContent).toContain('seed 0')
    unmount()
    render(<App />)
    expect((screen.getByRole('spinbutton', { name: 'Random seed' }) as HTMLInputElement).value).toBe('42')
  })
})
