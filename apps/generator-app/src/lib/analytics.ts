type AnalyticsProps = Record<string, string | number | boolean | null | undefined>

export const track = (event: string, props?: AnalyticsProps) => {
  if (typeof window === 'undefined') {
    return
  }
  const payload = {
    event,
    props: props || {},
    ts: new Date().toISOString(),
  }
  console.info('[analytics]', payload)
}
