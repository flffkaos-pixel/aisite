export const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Timeline Map</title>
<script src="https://unpkg.com/maplibre-gl@3.0.0/dist/maplibre-gl.js"></script>
<link href="https://unpkg.com/maplibre-gl@3.0.0/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/deck.gl@9.1.0/dist.min.js"></script>
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #10131a; }
  #map { position: absolute; inset: 0; }
  #overlay {
    position: absolute; top: 12px; left: 12px; right: 12px;
    pointer-events: none; z-index: 10;
  }
  #date {
    display: inline-block; background: rgba(0,0,0,0.55); color: #fff;
    padding: 6px 12px; border-radius: 18px; font: 600 13px/1.4 system-ui, sans-serif;
    backdrop-filter: blur(4px); margin-bottom: 8px;
  }
  #gps {
    display: none; background: rgba(0,0,0,0.55); color: #fff;
    padding: 6px 12px; border-radius: 18px; font: 600 13px/1.4 system-ui, sans-serif;
    backdrop-filter: blur(4px);
  }
  #btn3d {
    position: absolute; top: 12px; right: 12px; z-index: 20;
    width: 42px; height: 42px; border-radius: 50%;
    border: none; cursor: pointer;
    background: rgba(20,24,31,0.75); color: #fff;
    font: 600 14px/1 system-ui, sans-serif;
    backdrop-filter: blur(4px); box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
    touch-action: manipulation;
  }
  #btn3d.active { background: rgb(255,45,108); }
  .maplibregl-ctrl-attrib { font-size: 9px !important; }
</style>
</head>
<body>
<div id="map"></div>
<button id="btn3d" type="button">3D</button>
<div id="overlay">
  <div id="date"></div>
  <div id="gps"></div>
</div>
<script>
(function () {
  'use strict';
  const post = (msg) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  };

  const THEME = [255, 45, 108];
  const TRAIL_LENGTH = 300;

  let deckInstance = null;
  let map = null;
  let mode = 'timeline';
  let trips = [];
  let loopLength = 1;
  let currentTime = 0;
  let playing = false;
  let speed = 1;
  let lastFrame = null;
  let rafId = null;
  let lastProgress = 0;

  // GPS state
  let gpsPos = null;
  let gpsTrail = [];

  // 3D state
  let is3D = false;

  const DEM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

  function ensureDemSource() {
    if (!map) return;
    if (map.getSource('dem')) return;
    map.addSource('dem', {
      type: 'raster-dem',
      tiles: [DEM_URL],
      encoding: 'terrarium',
      maxzoom: 15,
      tileSize: 256
    });
  }

  function set3D(enabled) {
    is3D = enabled;
    const btn = document.getElementById('btn3d');
    btn.classList.toggle('active', enabled);
    btn.textContent = enabled ? '2D' : '3D';
    if (!deckInstance || !map) return;
    ensureDemSource();
    deckInstance.setProps({
      terrain: enabled ? { source: 'dem', exaggeration: 1.3 } : null,
      controller: { touchRotate: enabled, dragRotate: enabled, touchZoom: true, dragPan: true }
    });
    map.easeTo({ pitch: enabled ? 50 : 0, duration: 600 });
  }

  function toggle3D() {
    set3D(!is3D);
  }

  function init() {
    const container = document.getElementById('map');
    deckInstance = new deck.DeckGL({
      container: 'map',
      mapStyle: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
      initialViewState: { longitude: 126.978, latitude: 37.5665, zoom: 10 },
      controller: true,
      parameters: { depthTest: false }
    });
    map = deckInstance.getMapboxMap ? deckInstance.getMapboxMap() : null;
    if (map && map.on) {
      map.on('load', () => post({ type: 'ready' }));
    }
    setTimeout(() => post({ type: 'ready' }), 1200);
    document.getElementById('btn3d').addEventListener('click', toggle3D);
    requestAnimationFrame(tick);
  }

  function tick(t) {
    if (lastFrame === null) lastFrame = t;
    const dt = Math.min(0.1, (t - lastFrame) / 1000);
    lastFrame = t;
    if (playing && mode === 'timeline') {
      currentTime += dt * speed;
      if (currentTime >= loopLength) currentTime = 0;
      const now = performance.now();
      if (now - lastProgress > 100) {
        lastProgress = now;
        post({ type: 'progress', currentTime, loopLength });
      }
    }
    if (playing && mode === 'gps' && gpsPos) {
      updateGpsLayers();
    }
    rafId = requestAnimationFrame(tick);
  }

  function fitBounds() {
    if (!map || !trips.length) return;
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const trip of trips) {
      for (const [lon, lat] of trip.path) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
      }
    }
    const pad = 0.02;
    map.fitBounds(
      [[minLon - pad, minLat - pad], [maxLon + pad, maxLat + pad]],
      { padding: 60, duration: 0 }
    );
  }

  function currentPosition() {
    for (const trip of trips) {
      const ts = trip.timestamps;
      if (currentTime < ts[0] || currentTime > ts[ts.length - 1]) continue;
      for (let i = 0; i < ts.length - 1; i++) {
        if (currentTime >= ts[i] && currentTime <= ts[i + 1]) {
          const frac = (currentTime - ts[i]) / (ts[i + 1] - ts[i]);
          const a = trip.path[i];
          const b = trip.path[i + 1];
          return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
        }
      }
    }
    return null;
  }

  function buildTimelineLayers() {
    const layers = [
      new deck.TripsLayer({
        id: 'trips-layer',
        data: trips,
        getPath: d => d.path,
        getTimestamps: d => d.timestamps,
        getColor: () => THEME,
        widthMinPixels: 4,
        trailLength: TRAIL_LENGTH,
        currentTime,
        fadeTrail: true,
        jointRounded: true,
        capRounded: true
      })
    ];
    const pos = currentPosition();
    if (pos) {
      layers.push(new deck.IconLayer({
        id: 'head-layer',
        data: [{ position: pos }],
        getPosition: d => d.position,
        getIcon: d => 'marker',
        getSize: d => 5,
        sizeScale: 1,
        iconAtlas: 'data:image/svg+xml;utf8,' + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
          '<g><rect width="64" height="64" fill="none"/></g>' +
          '<circle cx="32" cy="32" r="20" fill="rgb(255,45,108)" stroke="#fff" stroke-width="4"/></svg>'
        ),
        iconMapping: { marker: { x: 0, y: 0, width: 64, height: 64, mask: false } },
        updateTriggers: { getPosition: currentTime }
      }));
    }
    return layers;
  }

  function buildGpsLayers() {
    const layers = [];
    if (gpsTrail.length > 1) {
      layers.push(new deck.PathLayer({
        id: 'gps-trail-layer',
        data: [{ path: gpsTrail }],
        getPath: d => d.path,
        getColor: () => [0, 150, 255],
        getWidth: 4,
        widthMinPixels: 3
      }));
    }
    if (gpsPos) {
      layers.push(new deck.IconLayer({
        id: 'gps-head-layer',
        data: [{ position: gpsPos }],
        getPosition: d => d.position,
        getIcon: d => 'marker',
        getSize: d => 5,
        sizeScale: 1,
        iconAtlas: 'data:image/svg+xml;utf8,' + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
          '<g><rect width="64" height="64" fill="none"/></g>' +
          '<circle cx="32" cy="32" r="20" fill="rgb(0,150,255)" stroke="#fff" stroke-width="4"/></svg>'
        ),
        iconMapping: { marker: { x: 0, y: 0, width: 64, height: 64, mask: false } }
      }));
    }
    return layers;
  }

  function updateGpsLayers() {
    if (!deckInstance) return;
    deckInstance.setProps({ layers: buildGpsLayers() });
    if (map && gpsPos) {
      map.easeTo({ center: gpsPos, duration: 300 });
    }
  }

  window.setTimelineData = function (data) {
    trips = data.trips || [];
    loopLength = data.loopLength || 1;
    currentTime = 0;
    mode = 'timeline';
    fitBounds();
    deckInstance.setProps({ layers: buildTimelineLayers() });
    post({ type: 'loaded', trips: trips.length, loopLength });
  };

  window.setPlaying = function (value) {
    playing = !!value;
    post({ type: 'playstate', playing });
  };

  window.setSpeed = function (value) {
    speed = value;
  };

  window.setCurrentTime = function (value) {
    currentTime = value;
    if (deckInstance) deckInstance.setProps({ layers: buildTimelineLayers() });
    post({ type: 'progress', currentTime, loopLength });
  };

  window.setGpsPosition = function (lat, lon) {
    gpsPos = [lon, lat];
    gpsTrail.push(gpsPos);
    if (gpsTrail.length > 2000) gpsTrail.shift();
    document.getElementById('gps').style.display = 'inline-block';
    document.getElementById('gps').textContent =
      'GPS  ' + lat.toFixed(5) + ', ' + lon.toFixed(5);
    updateGpsLayers();
  };

  window.setMode = function (m) {
    mode = m;
    playing = true;
    if (mode === 'timeline') {
      deckInstance.setProps({ layers: buildTimelineLayers() });
    }
  };

  window.getStatus = function () {
    return { mode, playing, speed, currentTime, loopLength };
  };

  init();
})();
</script>
</body>
</html>`;