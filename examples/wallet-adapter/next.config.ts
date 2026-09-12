import type {NextConfig} from 'next';

const basePath = process.env.BASE_PATH ?? '';

const config: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: process.env.ASSET_PREFIX ?? basePath,
  reactStrictMode: true,
};

export default config;
