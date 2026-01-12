import { useState, useCallback, type RefObject } from "react";
import type { NavItem, Rendition } from "epubjs";
import { updateBookLocation } from "~/services/db";
import type { TabId } from "~/components/DrawerTabs";

interface UseNavigationOptions {
  bookId: string;
  initialLocation: string | null;
  renditionRef: RefObject<Rendition | null>;
}

export function useNavigation({
  bookId,
  initialLocation,
  renditionRef,
}: UseNavigationOptions) {
  const [location, setLocation] = useState<string | null>(initialLocation);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("contents");

  const handleLocationChange = useCallback(
    (newLocation: string) => {
      setLocation(newLocation);
      updateBookLocation(bookId, newLocation).catch(console.error);
    },
    [bookId]
  );

  const handleTocChange = useCallback((newToc: NavItem[]) => {
    setToc(newToc);
  }, []);

  const navigate = useCallback(
    (location: string) => {
      renditionRef.current?.display(location);
      setIsDrawerOpen(false);
    },
    [renditionRef]
  );

  return {
    // State
    location,
    toc,
    isDrawerOpen,
    activeTab,
    // Setters
    setIsDrawerOpen,
    setActiveTab,
    // Handlers
    handleLocationChange,
    handleTocChange,
    navigate,
  };
}

