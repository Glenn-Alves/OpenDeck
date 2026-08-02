/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sql.js", "anki-apkg-export"],
    outputFileTracingIncludes: {
      "/api/anki/import": ["./node_modules/sql.js/dist/sql-wasm.wasm"],
    },
  },
};
module.exports = nextConfig;