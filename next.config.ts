import type { NextConfig } from "next";

/** Sent on every response. Cheap, and closes off whole classes of attack. */
const securityHeaders = [
  // Clickjacking: nothing may frame this site (protects the admin portal).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Stop browsers guessing content types (e.g. treating an upload as HTML).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak admin URLs to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // HTTPS only, once the domain is known good.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // PGlite (local dev database) must not be bundled by the server compiler.
  serverExternalPackages: ["@electric-sql/pglite"],

  experimental: {
    serverActions: {
      // Photos from a phone are routinely 3–6 MB. The default cap is 1 MB,
      // which would reject them, so allow room for the 8 MB we validate against.
      bodySizeLimit: "12mb",
    },
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Never let the admin portal be indexed or cached by a shared proxy.
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
