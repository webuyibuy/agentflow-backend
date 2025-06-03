export function jsonToCsv<T extends Record<string, any>>(
  data: T[],
  columns?: { key: keyof T; header: string }[],
): string {
  if (!data || data.length === 0) {
    return ""
  }

  // Determine columns and headers
  const actualColumns = columns || Object.keys(data[0]).map((key) => ({ key: key as keyof T, header: key }))

  // Create header row
  const header = actualColumns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",")

  // Create data rows
  const rows = data.map((row) => {
    return actualColumns
      .map((col) => {
        let value = row[col.key]
        if (value === null || value === undefined) {
          value = ""
        } else if (typeof value === "object") {
          // Handle nested objects/arrays by stringifying them
          value = JSON.stringify(value)
        } else {
          value = String(value)
        }
        // Escape double quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`
      })
      .join(",")
  })

  return [header, ...rows].join("\n")
}
