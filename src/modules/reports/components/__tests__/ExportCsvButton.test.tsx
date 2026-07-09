import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportCsvButton } from '../ExportCsvButton'

describe('ExportCsvButton', () => {
  it('renders the default label when none is provided', () => {
    render(<ExportCsvButton filename="report.csv" headers={['A']} rows={[['1']]} />)

    expect(screen.getByRole('button', { name: /exportar csv/i })).toBeInTheDocument()
  })

  it('renders a custom label when provided', () => {
    render(<ExportCsvButton filename="report.csv" headers={['A']} rows={[['1']]} label="Descargar" />)

    expect(screen.getByRole('button', { name: /descargar/i })).toBeInTheDocument()
  })

  it('triggers a Blob-based CSV download on click', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(
      <ExportCsvButton
        filename="report.csv"
        headers={['Agente', 'Tickets']}
        rows={[['Ana Martínez', 34]]}
      />
    )

    await user.click(screen.getByRole('button', { name: /exportar csv/i }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blobArg = createObjectURL.mock.calls[0][0] as Blob
    expect(blobArg).toBeInstanceOf(Blob)
    expect(blobArg.type).toBe('text/csv;charset=utf-8;')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    clickSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('escapes fields containing commas, quotes, or newlines per CSV convention', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(
      <ExportCsvButton
        filename="report.csv"
        headers={['Nombre', 'Nota']}
        rows={[['Doe, John', 'Dijo "hola"']]}
      />
    )

    await user.click(screen.getByRole('button', { name: /exportar csv/i }))

    const blobArg = createObjectURL.mock.calls[0][0] as Blob
    const text = await blobArg.text()
    expect(text).toContain('"Doe, John"')
    expect(text).toContain('"Dijo ""hola"""')

    clickSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
