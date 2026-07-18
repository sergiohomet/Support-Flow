import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportMenu } from '../ExportMenu'
import { buildMultiSectionCsv } from '../csv'
import { buildExcelBlob } from '../excel'
import { buildPdfBlob } from '../pdf'
import type { ReportSection } from '../types'

vi.mock('../csv', () => ({
  buildMultiSectionCsv: vi.fn(() => 'csv-content'),
}))
vi.mock('../excel', () => ({
  buildExcelBlob: vi.fn(async () => new Blob(['excel-content'])),
}))
vi.mock('../pdf', () => ({
  buildPdfBlob: vi.fn(() => new Blob(['pdf-content'])),
}))

const mockedBuildCsv = vi.mocked(buildMultiSectionCsv)
const mockedBuildExcel = vi.mocked(buildExcelBlob)
const mockedBuildPdf = vi.mocked(buildPdfBlob)

const sections: ReportSection[] = [
  { title: 'Resumen', headers: ['Métrica', 'Valor'], rows: [['Tickets abiertos', 10]] },
]

function renderMenu() {
  return render(
    <ExportMenu
      sections={sections}
      dateFrom="2026-01-01T00:00:00.000Z"
      dateTo="2026-01-31T00:00:00.000Z"
      pageSlug="reportes"
    />
  )
}

describe('ExportMenu', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockedBuildCsv.mockClear()
    mockedBuildExcel.mockClear()
    mockedBuildPdf.mockClear()

    createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    clickSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('el menú está cerrado por defecto', () => {
    renderMenu()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('el botón "Exportar" expone aria-haspopup="menu" y aria-expanded="false" por defecto', () => {
    renderMenu()
    const button = screen.getByRole('button', { name: /exportar/i })
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('al hacer click en el botón se abre el menú con los 3 ítems y aria-expanded pasa a "true"', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /exportar/i }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar/i })).toHaveAttribute('aria-expanded', 'true')
    const items = screen.getAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual(['CSV', 'Excel', 'PDF'])
  })

  it('click en "CSV" llama a buildMultiSectionCsv con las secciones, descarga con el nombre esperado y cierra el menú', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /exportar/i }))
    await user.click(screen.getByRole('menuitem', { name: 'CSV' }))

    expect(mockedBuildCsv).toHaveBeenCalledWith(sections)
    const blobArg = createObjectURL.mock.calls[0]?.[0] as Blob
    expect(blobArg.type).toBe('text/csv;charset=utf-8;')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('click en "Excel" llama a buildExcelBlob con las secciones y cierra el menú', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /exportar/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Excel' }))

    expect(mockedBuildExcel).toHaveBeenCalledWith(sections)
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('click en "PDF" llama a buildPdfBlob con las secciones y cierra el menú', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /exportar/i }))
    await user.click(screen.getByRole('menuitem', { name: 'PDF' }))

    expect(mockedBuildPdf).toHaveBeenCalledWith(sections)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('arma el nombre de archivo a partir de pageSlug/dateFrom/dateTo/extensión', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /exportar/i }))
    await user.click(screen.getByRole('menuitem', { name: 'CSV' }))

    expect(clickSpy).toHaveBeenCalledTimes(1)
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toBe('reportes_2026-01-01_2026-01-31.csv')
  })

  it('click afuera del menú lo cierra', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <ExportMenu
          sections={sections}
          dateFrom="2026-01-01T00:00:00.000Z"
          dateTo="2026-01-31T00:00:00.000Z"
          pageSlug="reportes"
        />
        <button type="button">Afuera</button>
      </div>
    )

    await user.click(screen.getByRole('button', { name: /exportar/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Afuera' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Escape cierra el menú y devuelve el foco al botón', async () => {
    const user = userEvent.setup()
    renderMenu()

    const button = screen.getByRole('button', { name: /exportar/i })
    await user.click(button)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })
})
