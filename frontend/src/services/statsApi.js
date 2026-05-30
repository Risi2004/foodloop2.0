import { buildUrl, parseResponse } from './api';

export const getPublicStats = async () => {
  const response = await fetch(buildUrl('/api/stats/public'));
  return parseResponse(response);
};
