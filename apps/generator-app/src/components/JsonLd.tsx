/**
 * Renders JSON-LD structured data as a script tag. Invisible to users; read by
 * search engines. Safe to render on the server.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is static, app-controlled content (no user input).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
