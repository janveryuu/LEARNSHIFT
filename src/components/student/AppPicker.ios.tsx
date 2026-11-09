import type { ComponentType } from 'react';
import { StyleSheet } from 'react-native';

import { SELECTION_ID } from '@/services/monitor/ios';

type SheetProps = {
  style: object;
  familyActivitySelectionId: string;
  onSelectionChange: () => void;
  onDismissRequest: () => void;
};

// Resolved once: builds without Screen Time don't include the native view.
const Sheet: ComponentType<SheetProps> | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-device-activity').DeviceActivitySelectionSheetViewPersisted ?? null;
  } catch {
    return null;
  }
})();

/** Apple's own sheet for choosing which apps Tarsi watches (Screen Time). */
export function AppPicker({ visible, onClose, onPicked }: { visible: boolean; onClose: () => void; onPicked: () => void }) {
  if (!visible || !Sheet) return null;
  return (
    <Sheet
      style={styles.anchor}
      familyActivitySelectionId={SELECTION_ID}
      onSelectionChange={() => onPicked()}
      onDismissRequest={() => onClose()}
    />
  );
}

const styles = StyleSheet.create({ anchor: { width: 1, height: 1, position: 'absolute' } });
