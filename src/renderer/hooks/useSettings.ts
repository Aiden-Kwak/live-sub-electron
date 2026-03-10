import { useCallback, useEffect, useState } from "react";
import type { AppConfig, FontSize } from "../lib/types";
import { getConfig, setConfig } from "../lib/electron-api";

const DEFAULT_CONFIG: AppConfig = {
  googleApiKey: "",
  openaiApiKey: "",
  sourceLanguage: "en-US",
  targetLanguage: "ko",
  engine: "google",
  model: "gpt-4.1-nano",
  fontSize: 20,
  showOriginal: false,
  context: "",
};

export function useSettings() {
  const [config, setConfigState] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load config from electron-store on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const loaded = await getConfig();
        if (!cancelled) {
          setConfigState(loaded);
          setIsLoaded(true);
        }
      } catch {
        // Fallback to defaults if IPC fails
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const updateConfig = useCallback(async (partial: Partial<AppConfig>) => {
    setConfigState((prev) => ({ ...prev, ...partial }));
    try {
      await setConfig(partial);
    } catch {
      // Silently fail - local state is already updated
    }
  }, []);

  const setFontSize = useCallback(
    (fontSize: FontSize) => updateConfig({ fontSize }),
    [updateConfig]
  );

  const toggleShowOriginal = useCallback(
    () => {
      setConfigState((prev) => {
        const next = { ...prev, showOriginal: !prev.showOriginal };
        setConfig({ showOriginal: next.showOriginal }).catch(() => {});
        return next;
      });
    },
    []
  );

  return {
    config,
    isLoaded,
    setFontSize,
    toggleShowOriginal,
    updateConfig,
  };
}
