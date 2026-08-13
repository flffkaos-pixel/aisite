import "./style.css";

import { TinyWorldEngine } from "./wgpu/tiny-world-engine";

const app = document.querySelector<HTMLDivElement>("#app")!;

const canvas = document.createElement("canvas");
canvas.id = "world";
canvas.className = "full";
app.appendChild(canvas);

const status = document.createElement("div");
status.id = "status";
status.textContent = "loading WebGPU…";
app.appendChild(status);

const engine = new TinyWorldEngine(canvas, {
  meshResolution: 128,
  renderScale: 1,
  cameraYaw: 0.8,
  cameraPitch: 0.5,
  cameraRadius: 130,
});

engine.onError = (message) => {
  status.textContent = `WebGPU error: ${message}`;
};

engine
  .init()
  .then(() => {
    status.textContent = "좌클릭·드래그: 섬 조각(huge rise) · Shift+클릭: 내리기 · 우클릭·드래그: 카메라 · 휠: 줌";
  })
  .catch((error) => {
    status.textContent = `WebGPU error: ${error instanceof Error ? error.message : String(error)}`;
    console.error(error);
  });