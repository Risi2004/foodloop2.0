import { useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PageLoader from "../../common/PageLoader/PageLoader";
import { ResourceLoadProvider } from "../../../contexts/ResourceLoadContext";
import { MaintenanceProvider, useMaintenance } from "../../../contexts/MaintenanceContext";
import MaintenanceBanner from "../../maintenance/MaintenanceBanner";
import MaintenanceScreen from "../../maintenance/MaintenanceScreen";
import { usePageResourcesReady } from "../../../hooks/usePageResourcesReady";
import "./RoleLayout.css";

/** Role home dashboards + customer marketplace — show scheduled maintenance banner */
function isHomeDashboardRoute(pathname) {
  if (/^\/customer\/marketplace\/?$/.test(pathname)) return true;
  return /^\/(supplier|donor|receiver|driver|admin)\/dashboard\/?$/.test(pathname);
}

function isDashboardRoute(pathname) {
  return /^\/(supplier|donor|receiver|driver|admin)\/dashboard\/?$/.test(pathname);
}

function isAdminRoute(pathname) {
  return /^\/admin(\/|$)/.test(pathname);
}

function RoleLayoutContent() {
  const { pathname } = useLocation();
  const containerRef = useRef(null);
  const { loaderHidden, resourcesReady } = usePageResourcesReady(containerRef);
  const hasDashboardLoadedRef = useRef(false);
  const isDashboard = isDashboardRoute(pathname);

  const {
    showMaintenanceUI,
    showScheduledBanner,
    banner,
    loading: maintenanceLoading,
  } = useMaintenance();

  useEffect(() => {
    if (isDashboard && resourcesReady) {
      hasDashboardLoadedRef.current = true;
    }
  }, [isDashboard, resourcesReady]);

  const showFullPageLoader =
    isDashboard && !resourcesReady && !hasDashboardLoadedRef.current;

  if (!maintenanceLoading && showMaintenanceUI && !isAdminRoute(pathname)) {
    return <MaintenanceScreen />;
  }

  const showBanner =
    !maintenanceLoading && showScheduledBanner && isHomeDashboardRoute(pathname);

  return (
    <>
      {showFullPageLoader && (
        <PageLoader
          message="Loading..."
          className={loaderHidden ? "page-loader--hidden" : ""}
        />
      )}
      {showBanner && <MaintenanceBanner banner={banner} />}
      <div ref={containerRef} className="role-layout__container">
        <Outlet />
      </div>
    </>
  );
}

export default function RoleLayout() {
  return (
    <MaintenanceProvider>
      <ResourceLoadProvider>
        <RoleLayoutContent />
      </ResourceLoadProvider>
    </MaintenanceProvider>
  );
}
