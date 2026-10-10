import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // The sandbox has many CPUs but a tight memory budget; Next spawns one
  // static-generation worker per CPU and the app bundle (ephemeris + ORM)
  // OOMs the box. Cap the worker count so the production build completes.
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;
