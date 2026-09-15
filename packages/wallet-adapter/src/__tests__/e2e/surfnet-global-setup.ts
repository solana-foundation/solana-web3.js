import {Surfnet} from '@solana/surfpool';
import type {TestProject} from 'vitest/node';

export default function setup(project: TestProject) {
  const surfnet = Surfnet.startWithConfig({
    blockProductionMode: 'clock',
    offline: true,
    slotTimeMs: 400,
  });
  project.provide('surfnetRpcUrl', surfnet.rpcUrl);
  project.provide('surfnetPayerSecretKey', Array.from(surfnet.payerSecretKey));
  return () => surfnet.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    surfnetPayerSecretKey: number[];
    surfnetRpcUrl: string;
  }
}
