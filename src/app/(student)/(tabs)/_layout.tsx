import { Tabs } from 'expo-router/js-tabs';

import { ShiftSheet } from '@/components/student/ShiftSheet';
import { TabBar, type TabKey } from '@/components/ui';
import { useT } from '@/i18n/useT';
import { useSession } from '@/store/useSession';

/**
 * Four tabs plus the raised Shift button. The Shift sheet renders inside the
 * tab bar slot, under the bar, so the button stays tappable and rotates to ×.
 */
export default function TabsLayout() {
  const t = useT();
  const open = useSession((s) => s.shiftOpen);
  const setOpen = useSession((s) => s.setShiftOpen);
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'shift' }}
      tabBar={(props) => {
        const key = props.state.routes[props.state.index]?.name as TabKey;
        return (
          <>
            <ShiftSheet visible={open} onClose={() => setOpen(false)} />
            <TabBar
              active={key}
              onTab={(k) => {
                setOpen(false);
                const route = props.state.routes.find((r) => r.name === k);
                if (route) props.navigateToTab(route.key);
              }}
              onShift={() => setOpen(!open)}
              shiftOpen={open}
              labels={t.tabs}
            />
          </>
        );
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
