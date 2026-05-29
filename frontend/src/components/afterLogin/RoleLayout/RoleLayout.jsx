import { useRef, useEffect, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PageLoader from "../../common/PageLoader/PageLoader";
import { ResourceLoadProvider } from "../../../contexts/ResourceLoadContext";
import { MaintenanceProvider, useMaintenance } from "../../../contexts/MaintenanceContext";
import MaintenanceNoticeModal, {
  dismissMaintenanceNotice,
  isMaintenanceNoticeDismissed,
} from "../../maintenance/MaintenanceNoticeModal";
import MaintenanceScreen from "../../maintenance/MaintenanceScreen";
import { usePageResourcesReady } from "../../../hooks/usePageResourcesReady";
import "./RoleLayout.css";

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
    isAdmin,
  } = useMaintenance();

  const [showNoticeModal, setShowNoticeModal] = useState(false);

  const handleDismissNotice = useCallback(() => {
    if (banner) dismissMaintenanceNotice(banner);
    setShowNoticeModal(false);
  }, [banner]);

  useEffect(() => {
    if (isDashboard && resourcesReady) {
      hasDashboardLoadedRef.current = true;
    }
  }, [isDashboard, resourcesReady]);

  useEffect(() => {
    if (maintenanceLoading || !showScheduledBanner || !banner) {
      setShowNoticeModal(false);
      return;
    }
    if (isMaintenanceNoticeDismissed(banner)) {
      setShowNoticeModal(false);
      return;
    }
    setShowNoticeModal(true);
  }, [maintenanceLoading, showScheduledBanner, banner]);

  const showFullPageLoader =
    isDashboard && !resourcesReady && !hasDashboardLoadedRef.current;

  const isNonAdminProtectedRoute = !isAdminRoute(pathname) && !isAdmin;

  if (isNonAdminProtectedRoute) {
    if (showMaintenanceUI) {
      return <MaintenanceScreen />;
    }
    if (maintenanceLoading) {
      return <div className="role-layout__maintenance-gate" role="status" aria-label="Loading" />;
    }
  }

  return (
    <>
      {showFullPageLoader && (
        <PageLoader
          message="Loading..."
          className={loaderHidden ? "page-loader--hidden" : ""}
        />
      )}
      <MaintenanceNoticeModal
        banner={banner}
        open={showNoticeModal}
        onDismiss={handleDismissNotice}
      />
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
