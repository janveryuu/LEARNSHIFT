/** Apple's app picker exists only on iPhone; elsewhere there is nothing to pick. */
export function AppPicker(_: { visible: boolean; onClose: () => void; onPicked: () => void }) {
  return null;
}
