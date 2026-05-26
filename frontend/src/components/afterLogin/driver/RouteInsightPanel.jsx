import './RouteInsightPanel.css';

function RouteInsightPanel({ routeInsight, loading, approximate = false }) {
  if (loading) {
    return (
      <div className="route-insight route-insight--loading">
        Calculating route and ETA…
      </div>
    );
  }

  if (!routeInsight) return null;

  const { eta, traffic, suggested, shorterDistanceRoute, distanceKm } = routeInsight;

  return (
    <div className={`route-insight ${approximate ? 'route-insight--approx' : ''}`}>
      <div className="route-insight__header">
        <span className="route-insight__badge">Suggested route</span>
        {approximate && (
          <span className="route-insight__warn">Approximate (straight line)</span>
        )}
      </div>
      <p className="route-insight__eta">
        Estimated arrival: <strong>{eta?.eta}</strong>
      </p>
      <p className="route-insight__traffic">{eta?.detail}</p>
      {distanceKm != null && (
        <p className="route-insight__meta">Distance: {distanceKm.toFixed(1)} km</p>
      )}
      {shorterDistanceRoute && shorterDistanceRoute !== suggested && (
        <p className="route-insight__alt">
          Shorter distance option: {((shorterDistanceRoute.distanceM || 0) / 1000).toFixed(1)} km
          ({Math.round(shorterDistanceRoute.durationSec / 60)} min base)
        </p>
      )}
      <p className="route-insight__disclaimer">
        Times use a traffic model, not live GPS traffic.
      </p>
    </div>
  );
}

export default RouteInsightPanel;
