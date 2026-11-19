import { useEffect, useState } from 'react'
import { request } from './api'

export function useRequest<T>(path: string) {
  const [result, setResult] = useState<{ path: string; data?: T; error?: unknown }>({ path: '' })
  useEffect(() => {
    const controller = new AbortController()
    request<T>(path, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResult({ path, data }) })
      .catch(error => { if (!controller.signal.aborted) setResult({ path, error }) })
    return () => controller.abort()
  }, [path])
  return result.path === path ? result : { path }
}
