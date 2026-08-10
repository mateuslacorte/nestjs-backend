/**
 * Exact OAuth post-login redirect allowlist matching.
 * Rejects prefix tricks like `https://app.example.com.evil.com` or `myapp://successful-phish`.
 */
export function isAllowedOAuthRedirect(
    redirect: string,
    allowlist: string[],
): boolean {
    const candidate = redirect.trim();
    if (!candidate || allowlist.length === 0) {
        return false;
    }

    return allowlist.some((entry) => {
        const allowed = entry.trim();
        return allowed.length > 0 && candidate === allowed;
    });
}
