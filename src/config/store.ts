type StoreFeatures = {
  kitBuilder3D: boolean;
};

export type StoreConfig = {
  features: StoreFeatures;
};

export const STORE_FEATURE_KEYS = {
  kitBuilder3D: "kit_builder_3d",
} as const;

export function parseBooleanFlag(value: string | undefined | null, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export const ENV_DEFAULT_STORE_CONFIG: StoreConfig = {
  features: {
    // Fallback local si no existe override en base de datos.
    kitBuilder3D: parseBooleanFlag(process.env.NEXT_PUBLIC_FEATURE_KIT_BUILDER_3D, false),
  },
};

export const storeConfig: StoreConfig = Object.freeze(ENV_DEFAULT_STORE_CONFIG);

export function isStoreFeatureEnabled(feature: keyof StoreFeatures): boolean {
  return storeConfig.features[feature];
}
