export function safeSlice<T>(value: any, start?: number, end?: number): T[] {
  if (Array.isArray(value)) return value.slice(start as any, end as any)
  return []
}

export function ensureArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value == null) return []
  // If it's a single object, wrap in array
  return [value] as T[]
}
