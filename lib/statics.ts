export const deviceTypes = [
  "eybondInv",
  "hps",
  "igenInv",
  "inv",
  "jfyInv",
  "jlInv",
  "max",
  "mix",
  "pbd",
  "pcs",
  "pumper",
  "spa",
  "sph",
  "storage",
  "tlx",
  "wit",
] as const;

export type DeviceType = (typeof deviceTypes)[number];

type SeverityColor = "green" | "orange" | "red";

export type StatusMessageMap = Record<number, [string, SeverityColor?]>;

export const statusMessagesByDeviceType = {
  storage: {
    "-1": ["Lost"],
    0: ["Standby", "orange"],
    1: ["PV&Grid Supporting Loads", "green"],
    2: ["Battery Discharging", "green"],
    3: ["Malfunction", "red"],
    4: ["Flash", "orange"],
    5: ["MPPT charge "],
    6: ["AC charge"],
    7: ["PV&Grid Charging"],
    8: ["PV&Grid Charging+Grid Bypass"],
    9: ["PV Charging+Grid Bypass"],
    10: ["Grid Charging+Grid Bypass"],
    11: ["Grid Bypass"],
    12: ["PV Charging+Loads Supporting"],
    13: ["AC charge and Discharge"],
    14: ["Combine charge and Discharge"],
  },
} as const satisfies Partial<Record<DeviceType, StatusMessageMap>>;

export const severityColorToEmoji: Record<SeverityColor, string> = {
  green: "✅",
  orange: "⚠️",
  red: "❌",
};

export const successResponse = {
  msg: "inv_set_success",
  success: true,
} as const satisfies GenericResponse;
export type GenericResponse = {
  msg: string;
  success: boolean;
};

export const setTypes = [
  "storage_shangke_output_start_time_period",
  "storage_shangke_output_end_time_period",
  "storage_spf5000_manualStartEn",
] as const;
