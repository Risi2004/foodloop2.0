import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useResourceLoad } from "../../../contexts/ResourceLoadContext";

/**
 * Renders nothing. When the Leaflet map is ready, signals to ResourceLoadContext
 * so the role layout loader can hide. Must be rendered inside MapContainer.
 */
function MapReadyNotifier() {
  const map = useMap();
  const { signalReady } = useResourceLoad();

  useEffect(() => {
    if (!map) return;
    map.whenReady(() => {
      signalReady("map");
    });
  }, [map, signalReady]);

  return null;
}

export default MapReadyNotifier;
