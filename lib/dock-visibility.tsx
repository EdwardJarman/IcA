import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

type DockVisibilityContextValue = {
  dockVisible: boolean;
  translateY: Animated.Value;
  hideDock: () => void;
  showDock: () => void;
};

const DockVisibilityContext = createContext<DockVisibilityContextValue | null>(null);

export function DockVisibilityProvider({ children }: { children: ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const visibleRef = useRef(true);
  const [dockVisible, setDockVisible] = useState(true);

  const hideDock = useCallback(() => {
    if (!visibleRef.current) return;
    visibleRef.current = false;
    Animated.timing(translateY, { toValue: 96, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished && !visibleRef.current) setDockVisible(false);
    });
  }, [translateY]);

  const showDock = useCallback(() => {
    if (visibleRef.current) return;
    visibleRef.current = true;
    setDockVisible(true);
    Animated.timing(translateY, { toValue: 0, duration: 170, useNativeDriver: true }).start();
  }, [translateY]);

  const value = useMemo(() => ({ dockVisible, translateY, hideDock, showDock }), [dockVisible, hideDock, showDock, translateY]);
  return <DockVisibilityContext.Provider value={value}>{children}</DockVisibilityContext.Provider>;
}

export function useDockVisibility() {
  const context = useContext(DockVisibilityContext);
  if (!context) throw new Error("useDockVisibility must be used inside DockVisibilityProvider");
  return context;
}

/** Attach only to a screen’s primary vertical scroller. */
export function useDockScroll() {
  const { hideDock, showDock } = useDockVisibility();
  const lastOffset = useRef(0);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextOffset = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = nextOffset - lastOffset.current;

    if (nextOffset <= 8 || delta < -6) showDock();
    else if (nextOffset > 24 && delta > 12) hideDock();

    lastOffset.current = nextOffset;
  }, [hideDock, showDock]);

  return { onScroll, scrollEventThrottle: 16 } as const;
}
