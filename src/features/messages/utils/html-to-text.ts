/**
 * Flattens an HTML-only email to plain text.
 *
 * The viewer renders text, never HTML: email HTML is attacker-controlled, so
 * putting it on the page means script injection, tracking pixels and remote
 * content. Rendering it properly needs sanitising plus a sandboxed iframe —
 * see todo.txt.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
