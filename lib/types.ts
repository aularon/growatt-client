import type Growatt from "./growatt.ts";

type ReturnAwaited<T extends (...args: any[]) => Promise<any>> = Awaited<
  ReturnType<T>
>;

type GrowattInstance = InstanceType<typeof Growatt>;

export type Device = ReturnAwaited<GrowattInstance["getPlantDevices"]>[number];
