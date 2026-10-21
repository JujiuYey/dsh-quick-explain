/** Host-side route all panel traffic goes through; the Host plugin owns it. */
export const ROUTE = '/api/quick-explain'

/** Normalize anything thrown into a human-readable string. */
export function errorMessage(failure) {
  return failure?.message ?? String(failure)
}

/** Every panel request is one POST to the single Host route. */
export async function call(endpoint, payload) {
  const response = await fetch(ROUTE, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint, payload: payload ?? null }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.json()
  if (!body || body.ok !== true) throw new Error(body?.error?.message ?? '请求失败')
  return body.value
}
