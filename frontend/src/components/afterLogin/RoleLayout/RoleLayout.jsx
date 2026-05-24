import { useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PageLoader from "../../common/PageLoader/PageLoader";
import { ResourceLoadProvider } from "../../../contexts/ResourceLoadContext";
import { usePageResourcesReady } from "../../../hooks/usePageResourcesReady";
import "./RoleLayout.css";

/** True only for /donor/dashboard, /receiver/dashboard, /driver/dashboard, /admin/dashboard */
function isDashboardRoute(pathname) {
  return /^\/(donor|receiver|driver|admin)\/dashboard\/?$/.test(pathname);
}

/**
 * Full-page loading only on the first dashboard load. After that, navigating to
 * Contact Us (dashboard#contact) or other role pages does not show the loader—
 * dashboard load is assumed to have loaded shared assets for the role.
 */
function RoleLayoutContent() {
  const { pathname } = useLocation();
  const containerRef = useRef(null);
  const { loaderHidden, resourcesReady } = usePageResourcesReady(containerRef);
  const hasDashboardLoadedRef = useRef(false);
  const isDashboard = isDashboardRoute(pathname);

  useEffect(() => {
    if (isDashboard && resourcesReady) {
      hasDashboardLoadedRef.current = true;
    }
  }, [isDashboard, resourcesReady]);

  const showFullPageLoader =
    isDashboard && !resourcesReady && !hasDashboardLoadedRef.current;

  return (
    <>
      {showFullPageLoader && (
        <PageLoader
          message="Loading..."
          className={loaderHidden ? "page-loader--hidden" : ""}
        />
      )}
      <div ref={containerRef} className="role-layout__container">
        <Outlet />
      </div>
    </>
  );
}

export default function RoleLayout() {
  return (
    <ResourceLoadProvider>
      <RoleLayoutContent />
    </ResourceLoadProvider>
  );
}
