import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentWeather } from '../../../services/weatherApi';
import { resolveWeatherLocation } from '../../../utils/weatherLocationResolver';
import './WeatherWidget.css';

function formatTemperature(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return `${Math.round(num)}°C`;
}

function WeatherWidget() {
  const [data, setData] = useState(null);
  const [resolvedLabel, setResolvedLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWeather = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      const loc = await resolveWeatherLocation();
      setResolvedLabel(loc?.label || '');
      const res = await getCurrentWeather(loc.lat, loc.lng, 'metric', forceRefresh);
      setData(res?.weather || null);
    } catch (err) {
      setError(err.message || 'Weather unavailable right now.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(false);
  }, [loadWeather]);

  const locationLabel = useMemo(() => {
    const name = data?.location?.name;
    const country = data?.location?.country;
    const badName = !name || String(name).toLowerCase() === 'globe';
    if (!badName && country && String(country).toUpperCase() === 'LK') return `${name}, ${country}`;
    if (resolvedLabel) return resolvedLabel;
    if (name && country) return `${name}, ${country}`;
    return name || 'Local weather';
  }, [data, resolvedLabel]);

  if (loading) {
    return <div className="weather-widget weather-widget--loading">Loading weather...</div>;
  }

  if (error) {
    return (
      <div className="weather-widget weather-widget--error">
        <span>{error}</span>
        <button type="button" onClick={() => loadWeather(true)}>
          Retry
        </button>
      </div>
    );
  }

  if (!data?.current) return null;

  return (
    <div className="weather-widget" role="status" aria-live="polite">
      <div className="weather-widget__left">
        {data.current.icon ? (
          <img src={data.current.icon} alt={data.current.description || 'Weather icon'} />
        ) : (
          <div className="weather-widget__icon-fallback">Wx</div>
        )}
        <div>
          <p className="weather-widget__location">{locationLabel}</p>
          <p className="weather-widget__condition">
            {data.current.condition} - {data.current.description}
          </p>
        </div>
      </div>
      <div className="weather-widget__right">
        <div className="weather-widget__temp">{formatTemperature(data.current.temperature)}</div>
        <div className="weather-widget__meta">
          <span>Feels {formatTemperature(data.current.feelsLike)}</span>
          <span>Humidity {data.current.humidity ?? '--'}%</span>
          <span>Wind {data.current.windSpeed ?? '--'} m/s</span>
        </div>
        <button type="button" className="weather-widget__refresh" onClick={() => loadWeather(true)}>
          Refresh
        </button>
      </div>
    </div>
  );
}

export default WeatherWidget;
