/** Serialize JSON-LD for embedding in a <script> tag without breaking out via </script>. */
export function serializeJsonLd(value: unknown): string {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}
