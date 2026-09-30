import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingIncludes: {
    "/api/project-documents": ["./src/app/fonts/NRT-Reg.ttf"],
  },
};

export default nextConfig;
