type PointValue = string | number | { latLng?: unknown; point?: unknown } | null | undefined;

function parseCoordinate(value: PointValue): [number, number] | null {
  let v: unknown = value;
  if (v && typeof v === 'object') {
    const obj = v as { latLng?: unknown; point?: unknown };
    v = obj.latLng ?? obj.point;
  }
  if (typeof v === 'number') {
    return null;
  }
  if (typeof v !== 'string' || !v.trim()) {
    return null;
  }
  let cleaned = v.trim();
  if (cleaned.startsWith('geo:')) {
    cleaned = cleaned.slice(4);
  }
  cleaned = cleaned.split('?')[0].replace(/°/g, '').replace(/ /g, '');
  const parts = cleaned.split(',');
  if (parts.length < 2) {
    return null;
  }
  let lat = Number(parts[0]);
  let lon = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }
  if (Math.abs(lat) > 1_000_000 || Math.abs(lon) > 1_000_000) {
    lat /= 10_000_000;
    lon /= 10_000_000;
  }
  if (!(lat >= -85.05 && lat <= 85.05 && lon >= -180 && lon <= 180)) {
    return null;
  }
  return [lat, lon];
}

function extractE7(
  obj: Record<string, unknown> | undefined,
  latKey: string,
  lonKey: string,
): [number, number] | null {
  if (!obj) return null;
  const lat = obj[latKey];
  const lon = obj[lonKey];
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  return [lat / 10_000_000, lon / 10_000_000];
}

function toMs(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export interface TimelinePoint {
  t: number;
  lat: number;
  lon: number;
}

export interface Trip {
  path: [number, number][];
  timestamps: number[];
}

export interface ParsedTimeline {
  points: TimelinePoint[];
  trips: Trip[];
  baseTime: number;
  duration: number;
  bounds: [[number, number], [number, number]];
}

export function parseTimeline(text: string): ParsedTimeline {
  const data: unknown = JSON.parse(text);

  let segments: unknown[];
  if (Array.isArray(data)) {
    segments = data;
  } else if (data && typeof data === 'object') {
    const dict = data as Record<string, unknown>;
    const sem = dict.semanticSegments;
    const objs = dict.timelineObjects;
    if (Array.isArray(sem)) segments = sem;
    else if (Array.isArray(objs)) segments = objs;
    else segments = [];
  } else {
    throw new Error('Timeline JSON must start with an object or array');
  }

  const raw: { t: number; lat: number; lon: number }[] = [];

  const addPoint = (timeValue: unknown, coordValue: PointValue | [number, number] | null) => {
    let coord: [number, number] | null = null;
    if (Array.isArray(coordValue)) {
      coord = coordValue;
    } else {
      coord = parseCoordinate(coordValue as PointValue);
    }
    const t = toMs(timeValue);
    if (t === null || !coord) return;
    raw.push({ t, lat: coord[0], lon: coord[1] });
  };

  for (const seg of segments) {
    if (!seg || typeof seg !== 'object') continue;
    const s = seg as Record<string, unknown>;

    const activitySegment = s.activitySegment as Record<string, unknown> | undefined;
    const placeVisit = s.placeVisit as Record<string, unknown> | undefined;
    const waypointPath = s.waypointPath as Record<string, unknown> | undefined;

    const startTime = toMs(s.startTime);
    const endTime = toMs(s.endTime);

    const timelinePath = s.timelinePath as unknown[] | undefined;
    if (Array.isArray(timelinePath)) {
      for (const p of timelinePath) {
        if (p && typeof p === 'object') {
          const pt = p as Record<string, unknown>;
          addPoint(pt.time, pt.point as PointValue);
        }
      }
    }

    if (activitySegment) {
      const segTimelinePath = activitySegment.timelinePath as unknown[] | undefined;
      if (Array.isArray(segTimelinePath)) {
        for (const p of segTimelinePath) {
          if (p && typeof p === 'object') {
            const pt = p as Record<string, unknown>;
            addPoint(pt.time, pt.point as PointValue);
          }
        }
      }
      const center = extractE7(activitySegment, 'centerLatE7', 'centerLngE7');
      if (center) {
        addPoint(s.startTime, center);
        addPoint(s.endTime, center);
      }
      const simplified = activitySegment.simplifiedRawPath as Record<string, unknown> | undefined;
      const simplifiedPoints = simplified?.points as unknown[] | undefined;
      if (Array.isArray(simplifiedPoints)) {
        for (const p of simplifiedPoints) {
          if (p && typeof p === 'object') {
            const pt = p as Record<string, unknown>;
            const coord = extractE7(pt, 'latE7', 'lngE7');
            addPoint(pt.timestampMs, coord);
          }
        }
      }
      const start = activitySegment.start as Record<string, unknown> | undefined;
      const end = activitySegment.end as Record<string, unknown> | undefined;
      addPoint(startTime, start?.latE7 !== undefined ? extractE7(start, 'latE7', 'lngE7') : null);
      addPoint(endTime, end?.latE7 !== undefined ? extractE7(end, 'latE7', 'lngE7') : null);
    }

    if (placeVisit) {
      const location = placeVisit.location as Record<string, unknown> | undefined;
      const duration = placeVisit.duration as
        | Record<string, unknown>
        | undefined;
      if (location) {
        const coord =
          extractE7(location, 'latitudeE7', 'longitudeE7') ??
          extractE7(location, 'latE7', 'lngE7');
        if (coord) {
          addPoint(duration?.startTimestampMs, coord);
          addPoint(duration?.endTimestampMs, coord);
        }
      }
    }

    if (waypointPath) {
      const points = waypointPath.points as unknown[] | undefined;
      if (Array.isArray(points)) {
        for (const p of points) {
          if (p && typeof p === 'object') {
            const pt = p as Record<string, unknown>;
            const coord = extractE7(pt, 'latE7', 'lngE7');
            addPoint(pt.timestampMs, coord);
          }
        }
      }
    }

    const activity = s.activity as Record<string, unknown> | undefined;
    if (activity) {
      addPoint(startTime, activity.start as PointValue);
      addPoint(endTime, activity.end as PointValue);
    }

    const visit = s.visit as Record<string, unknown> | undefined;
    const topCandidate = visit?.topCandidate as Record<string, unknown> | undefined;
    const placeLocation = topCandidate?.placeLocation as PointValue;
    if (visit && placeLocation) {
      addPoint(startTime, placeLocation);
      addPoint(endTime, placeLocation);
    }

    const activityStart = s.activityStart;
    const activityEnd = s.activityEnd;
    if (activityStart && typeof activityStart === 'object') {
      const a = activityStart as Record<string, unknown>;
      const coord = extractE7(a, 'latE7', 'lngE7');
      addPoint(s.startTime, coord);
    }
    if (activityEnd && typeof activityEnd === 'object') {
      const a = activityEnd as Record<string, unknown>;
      const coord = extractE7(a, 'latE7', 'lngE7');
      addPoint(s.endTime, coord);
    }
  }

  const unique = new Map<string, { t: number; lat: number; lon: number }>();
  for (const p of raw) {
    unique.set(`${p.t}|${p.lat}|${p.lon}`, p);
  }
  const points = [...unique.values()].sort((a, b) => a.t - b.t);
  if (points.length === 0) {
    throw new Error('No valid timeline points found');
  }

  const baseTime = points[0].t;
  const duration = Math.max(1, (points[points.length - 1].t - baseTime) / 1000);

  const trips: Trip[] = [];
  let current: Trip | null = null;
  for (const p of points) {
    const pos: [number, number] = [p.lon, p.lat];
    const ts = (p.t - baseTime) / 1000;
    if (!current) {
      current = { path: [pos], timestamps: [ts] };
      trips.push(current);
      continue;
    }
    const last = current.path[current.path.length - 1];
    const distKm = haversine(last[1], last[0], pos[1], pos[0]);
    if (distKm > 30) {
      current = { path: [pos], timestamps: [ts] };
      trips.push(current);
    } else {
      current.path.push(pos);
      current.timestamps.push(ts);
    }
  }

  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }
  const bounds: [[number, number], [number, number]] = [
    [minLon, minLat],
    [maxLon, maxLat],
  ];

  return { points, trips, baseTime, duration, bounds };
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}