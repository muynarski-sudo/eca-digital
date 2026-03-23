const styles = {
  CRITICO: 'bg-red-100 text-red-800 border border-red-300',
  ALTO:    'bg-orange-100 text-orange-800 border border-orange-300',
  MEDIO:   'bg-yellow-100 text-yellow-800 border border-yellow-300',
  BAIXO:   'bg-green-100 text-green-800 border border-green-300',
}

export default function RiscoTag({ nivel, small = false }) {
  const n = nivel?.toUpperCase()
  return (
    <span className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${
      small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
    } ${styles[n] || 'bg-gray-100 text-gray-600'}`}>
      {n}
    </span>
  )
}
