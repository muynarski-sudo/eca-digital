export function StreakChip({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 font-bold text-brand-blue-dark">
      <span aria-hidden="true" className="text-brand-red">
        ●
      </span>
      {days === 0
        ? 'Comece sua sequência hoje'
        : days === 1
          ? '1 dia seguido'
          : `${days} dias seguidos`}
    </span>
  );
}
