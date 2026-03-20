import { NativeModules } from 'react-native';

type SharedDefaultsModule = {
  set?: (values: Record<string, string | number>) => Promise<void> | void;
};

type WidgetCenterModule = {
  reloadAllTimelines?: () => void;
};

/**
 * Update the widget with current streak data.
 * Call after each session completes.
 */
export async function updateWidget(streak: number): Promise<void> {
  const sharedDefaults = NativeModules.SharedUserDefaults as SharedDefaultsModule | undefined;
  const widgetCenter = NativeModules.WidgetCenter as WidgetCenterModule | undefined;

  if (!sharedDefaults?.set) {
    console.log(`[Widget] No native widget bridge available. Latest streak: ${streak}`);
    return;
  }

  await Promise.resolve(
    sharedDefaults.set({
      streak,
      lastDate: new Date().toISOString().slice(0, 10),
    })
  );
  widgetCenter?.reloadAllTimelines?.();
}
