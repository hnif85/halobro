// Middleware is disabled. Auth is handled by dashboard layout (server-side) and individual API routes.
// In Next.js 16, "middleware" is deprecated in favor of "proxy".
// We use per-route auth checks instead which is more reliable.
export async function middleware() {
  // Allow all requests - auth happens in layout and API routes
  return;
}

export const config = {
  matcher: [],
};