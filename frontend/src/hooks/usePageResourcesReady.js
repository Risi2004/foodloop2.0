import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useResourceLoad } from "../contexts/ResourceLoadContext";

const MIN_LOADER_MS = 800;
const MAX_WAIT_MS = 8000;
const MAP_CHECK_DELAY_MS = 150;

/**
 * Wait for all images in container and (if present) map ready, with min/max time.
 * Same behavior as landing page loader; adds optional map wait via ResourceLoadContext.
 * Must be used inside ResourceLoadProvider.
 * Resets when pathname changes so each page gets its own load wait.
 * @param {React.RefObject<HTMLElement>} containerRef - ref to the element that wraps the page content
 * @param {{ minMs?: number, maxMs?: number }} options
 * @returns {{ loaderHidden: boolean, resourcesReady: boolean }}
 */
export function usePageResourcesReady(containerRef, options = {}) {
  const { minMs = MIN_LOADER_MS, maxMs = MAX_WAIT_MS } = options;
  const { pathname } = useLocation();
  const { isReady } = useResourceLoad();

  const [loaderHidden, setLoaderHidden] = useState(false);
  const [resourcesReady, setResourcesReady] = useState(false);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [hasMapContainer, setHasMapContainer] = useState(false);

  const mapReady = isReady("map");

  // Reset state when route changes so the new page gets its own loader
  useEffect(() => {
    setLoaderHidden(false);
    setResourcesReady(false);
    setAllImagesLoaded(false);
    setMinTimeReached(false);
    setHasMapContainer(false);
  }, [pathname]);

  // Effect 1: set up image load listeners, min/max timers, and detect map container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      setLoaderHidden(true);
      setTimeout(() => {
        if (!cancelled) setResourcesReady(true);
      }, 400);
    };

    const run = () => {
      if (cancelled) return;

      // Detect map after a short delay so Leaflet can mount
      const mapCheckTimer = setTimeout(() => {
        if (cancelled) return;
        const hasMap = !!container.querySelector(".leaflet-container");
        setHasMapContainer(hasMap);
      }, MAP_CHECK_DELAY_MS);

      const imgs = container.querySelectorAll("img");
      if (imgs.length === 0) {
        setAllImagesLoaded(true);
        const minTimer = setTimeout(() => {
          if (cancelled) return;
          setMinTimeReached(true);
        }, minMs);
        const maxTimer = setTimeout(finish, maxMs);
        return () => {
          cancelled = true;
          clearTimeout(mapCheckTimer);
          clearTimeout(minTimer);
          clearTimeout(maxTimer);
        };
      }

      let loaded = 0;
      const onLoad = () => {
        loaded += 1;
        if (loaded >= imgs.length) {
          setAllImagesLoaded(true);
        }
      };

      imgs.forEach((img) => {
        if (img.complete) onLoad();
        else img.addEventListener("load", onLoad);
      });

      const minTimer = setTimeout(() => {
        if (!cancelled) setMinTimeReached(true);
      }, minMs);
      const maxTimer = setTimeout(finish, maxMs);

      return () => {
        cancelled = true;
        clearTimeout(mapCheckTimer);
        clearTimeout(minTimer);
        clearTimeout(maxTimer);
        imgs.forEach((img) => img.removeEventListener("load", onLoad));
      };
    };

    let cleanup = null;
    const rafId = requestAnimationFrame(() => {
      cleanup = run();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (typeof cleanup === "function") cleanup();
    };
  }, [pathname, containerRef, minMs, maxMs]);

  // Effect 2: when map becomes ready (and we have images + min time), finish
  useEffect(() => {
    const canFinish =
      allImagesLoaded &&
      minTimeReached &&
      (!hasMapContainer || mapReady);

    if (canFinish) {
      setLoaderHidden(true);
      setTimeout(() => setResourcesReady(true), 400);
    }
  }, [allImagesLoaded, minTimeReached, hasMapContainer, mapReady]);

  return { loaderHidden, resourcesReady };
}
