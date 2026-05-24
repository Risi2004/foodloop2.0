import "./PageLoader.css";

/**
 * Full-screen loading overlay with centered logo and circle loading effect (FoodLoop theme).
 */
function PageLoader({ message = "Loading...", className = "" }) {
  return (
    <div
      className={`page-loader ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="page-loader__inner">
        <div className="page-loader__circle-loading" aria-hidden="true" />
        <div className="page-loader__logo-wrap">
          <img src="/logo.png" alt="" className="page-loader__logo" />
        </div>
      </div>
      {message && (
        <p className="page-loader__message">{message}</p>
      )}
    </div>
  );
}

export default PageLoader;
