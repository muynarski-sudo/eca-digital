import { redirect } from 'next/navigation';
import { requireMe } from '@/lib/session';

export default async function Home() {
  const me = await requireMe();
  redirect(me.role === 'student' ? '/inicio' : '/professora');
}
