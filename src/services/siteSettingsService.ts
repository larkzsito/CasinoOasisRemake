// ========================================================
// SERVICIO DE AJUSTES GLOBALES Y MANTENIMIENTO — CASINO OASIS
// ========================================================
import { apiRequest } from "./database";
import { getCurrentUser } from "./authService";

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@oasis.com";

export interface SiteSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEndTime?: number | null;
  updatedAt?: any;
  updatedBy?: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  maintenanceMode: false,
  maintenanceMessage:
    "Estamos realizando labores de mantenimiento y mejoras en la plataforma. Volveremos a estar disponibles muy pronto.",
  maintenanceEndTime: null,
  updatedBy: ADMIN_EMAIL,
};

let cachedSettings: SiteSettings = { ...DEFAULT_SITE_SETTINGS };
const settingsListeners: Set<(settings: SiteSettings) => void> = new Set();

/**
 * Obtener ajustes del sitio desde la base de datos
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const data = await apiRequest<SiteSettings>("/settings");
    const rawMaint = Boolean(data.maintenanceMode);
    const rawEndTime =
      typeof data.maintenanceEndTime === "number" ? data.maintenanceEndTime : null;
    const isExpired =
      rawMaint && rawEndTime !== null && rawEndTime > 0 && Date.now() >= rawEndTime;

    cachedSettings = {
      maintenanceMode: rawMaint && !isExpired,
      maintenanceMessage: data.maintenanceMessage || DEFAULT_SITE_SETTINGS.maintenanceMessage,
      maintenanceEndTime: isExpired ? null : rawEndTime,
      updatedAt: data.updatedAt || null,
      updatedBy: data.updatedBy || "",
    };

    settingsListeners.forEach((fn) => fn(cachedSettings));
    return cachedSettings;
  } catch (error) {
    console.warn("[SiteSettings] Usando valores por defecto:", error);
    return cachedSettings;
  }
}

/**
 * Suscribirse a cambios en los ajustes del sitio (polling cada 4s)
 */
export function subscribeSiteSettings(
  callback: (settings: SiteSettings) => void,
  onError?: (error: Error) => void
): () => void {
  settingsListeners.add(callback);
  callback(cachedSettings);

  // Primer fetch inmediato
  getSiteSettings().catch((e) => {
    if (onError) onError(e);
  });

  const timer = setInterval(() => {
    getSiteSettings().catch((e) => {
      if (onError) onError(e);
    });
  }, 4000);

  return () => {
    settingsListeners.delete(callback);
    clearInterval(timer);
  };
}

/**
 * Actualizar ajustes de mantenimiento en la base de datos
 */
export async function updateSiteSettings(
  updates: Partial<Pick<SiteSettings, "maintenanceMode" | "maintenanceMessage" | "maintenanceEndTime">>
): Promise<void> {
  const user = getCurrentUser();
  const callerEmail = user?.email || ADMIN_EMAIL;

  const payload = {
    ...updates,
    updatedAt: Date.now(),
    updatedBy: callerEmail,
  };

  const saved = await apiRequest<SiteSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  cachedSettings = { ...cachedSettings, ...saved };
  settingsListeners.forEach((fn) => fn(cachedSettings));
}
