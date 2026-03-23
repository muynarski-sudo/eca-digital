import Layout from '../../components/Layout'
import { mapaCalorEdtech, DIMENSOES_CALOR, ESCALA, calcularScoreCalor } from '../../data/mapaCalor'

const cellColor = (val) => {
  if (val === 4) return 'bg-red-500 text-white'
  if (val === 3) return 'bg-orange-400 text-white'
  if (val === 2) return 'bg-yellow-400 text-gray-800'
  return 'bg-green-400 text-white'
}

export default function MapaCalor() {
  const score = calcularScoreCalor()

  const nivelColor = {
    CRITICO: 'text-red-700 bg-red-50 border-red-300',
    ALTO:    'text-orange-700 bg-orange-50 border-orange-300',
    MEDIO:   'text-yellow-700 bg-yellow-50 border-yellow-300',
    BAIXO:   'text-green-700 bg-green-50 border-green-300',
  }

  return (
    <Layout title="Mapa de Calor" subtitle="Exposição ao risco regulatório por categoria — EdTechs e Escolas" printable>
      {/* Score consolidado */}
      <div className={`border rounded-xl p-5 mb-5 ${nivelColor[score.nivel]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Score de Exposição Consolidado</p>
            <p className="text-xs opacity-75 mt-0.5">Calculado sobre {mapaCalorEdtech.length} categorias × 5 dimensões</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{score.label}</p>
            <p className="text-sm font-medium">{Math.round(score.pct)}% de exposição máxima</p>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 mb-4 flex-wrap no-print">
        <span className="text-xs text-gray-500 font-medium">Escala:</span>
        {ESCALA.map(e => (
          <span key={e.valor} className={`text-xs font-semibold px-2.5 py-1 rounded ${cellColor(e.valor)}`}>
            {e.valor} — {e.label}
          </span>
        ))}
      </div>

      {/* Heat map table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left px-4 py-3 font-semibold min-w-[200px]">Categoria</th>
                {DIMENSOES_CALOR.map(d => (
                  <th key={d.key} className="px-3 py-3 font-semibold text-center w-20">
                    <div>{d.key}</div>
                    <div className="text-gray-400 font-normal text-xs hidden md:block">{d.label.split(' ')[0]}</div>
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {mapaCalorEdtech.map((item, idx) => {
                const total = DIMENSOES_CALOR.reduce((a, d) => a + item[d.key], 0)
                const maxScore = DIMENSOES_CALOR.length * 4
                const pct = Math.round((total / maxScore) * 100)
                return (
                  <tr key={item.itemId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.categoria}</td>
                    {DIMENSOES_CALOR.map(d => (
                      <td key={d.key} className="px-1 py-1.5 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm ${cellColor(item[d.key])}`}>
                          {item[d.key]}
                        </span>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                        pct >= 75 ? 'bg-red-100 text-red-700' : pct >= 60 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {pct}%
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dimensões legenda */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        {DIMENSOES_CALOR.map(d => (
          <div key={d.key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-bold text-gray-800 mb-1">{d.key} — {d.label}</p>
            <p className="text-xs text-gray-600">{d.desc}</p>
          </div>
        ))}
      </div>

      {/* Detalhamento por categoria */}
      <div className="space-y-3">
        {mapaCalorEdtech
          .sort((a, b) => {
            const scoreA = DIMENSOES_CALOR.reduce((s, d) => s + a[d.key], 0)
            const scoreB = DIMENSOES_CALOR.reduce((s, d) => s + b[d.key], 0)
            return scoreB - scoreA
          })
          .map(item => {
            const total = DIMENSOES_CALOR.reduce((a, d) => a + item[d.key], 0)
            const pct = Math.round((total / (DIMENSOES_CALOR.length * 4)) * 100)
            return (
              <div key={item.itemId} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-gray-800">{item.categoria}</p>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    pct >= 75 ? 'bg-red-100 text-red-700' : pct >= 60 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{pct}% exposição</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">{item.descricao}</p>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-blue-800 mb-0.5">Ação Recomendada</p>
                  <p className="text-xs text-blue-700">{item.acaoRecomendada}</p>
                </div>
              </div>
            )
          })}
      </div>
    </Layout>
  )
}
