import Sidebar from './Sidebar'
import { Printer } from 'lucide-react'

export default function Layout({ children, title, subtitle, printable = false }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-auto">
        {/* Header */}
        <header className="no-print bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {printable && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
          )}
        </header>

        {/* Print header (only visible when printing) */}
        {printable && (
          <div className="print-only px-8 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{title}</h1>
                {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
              </div>
              <p className="text-sm text-gray-500">ECA Digital Compliance • {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        )}

        <div className="px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
