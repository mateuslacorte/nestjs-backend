import { AppReply } from '@common/http/app-http';

/**
 * Drops a trailing empty fragment (`...#`) that some clients append or
 * accidentally serialize. Keeps real hash routes (`#/path`).
 */
export function stripTrailingEmptyHash(url: string): string {
    if (url.endsWith('#')) {
        return url.slice(0, -1);
    }
    return url;
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Sends the browser (or AuthSession) to the client redirect URL without a
 * trailing empty `#`.
 *
 * Always uses HTML + `location.replace()` (http(s) and custom schemes like
 * `myapp://…`) so the navigation target is exactly `redirectUrl`. A bare 302
 * Location can re-attach a previous fragment or get a trailing `#` from
 * Chrome Custom Tabs / AuthSession.
 */
export function sendOAuthClientRedirect(
    reply: AppReply,
    redirectUrl: string,
): void {
    const cleanUrl = stripTrailingEmptyHash(redirectUrl);
    const html =
        `<!DOCTYPE html><html><head><meta charset="utf-8">` +
        `<meta http-equiv="refresh" content="0;url=${escapeHtmlAttribute(cleanUrl)}">` +
        `<title>Redirecting</title>` +
        `<script>window.location.replace(${JSON.stringify(cleanUrl)});</script>` +
        `</head><body></body></html>`;

    reply
        .status(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Cache-Control', 'no-store')
        .send(html);
}
