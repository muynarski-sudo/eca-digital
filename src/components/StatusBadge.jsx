const styles = {
  conforme:      'bg-green-100 text-green-800 border border-green-200',
  em_andamento:  'bg-yellow-100 text-yellow-800 border border-yellow-200',
  nao_conforme:  'bg-red-100 text-red-800 border border-red-200',
  nao_aplicavel: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const labels = {
  conforme:      '✅ Conforme',
  em_andamento:  '🔄 Em Andamento',
  nao_conforme:  '❌ Não Conforme',
  nao_aplicavel: '⚪ N/A',
}

export default function StatusBadge({ status, small = false }) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${
      small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
    } ${styles[status] || styles.nao_conforme}`}>
      {labels[status] || status}
    </span>
  )
}
