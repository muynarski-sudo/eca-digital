export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prepareLocal } = await import('./instrumentation-node');
    await prepareLocal();
  }
}
