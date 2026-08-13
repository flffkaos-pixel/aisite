// Tiny World — a self-contained WebGPU island diorama you can sculpt.
// Sky + sun, a procedural water plane, and a GPU height-field island whose
// terrain you carve by dragging. Left drag raises, Shift+left drag lowers,
// right drag orbits, wheel zooms.

export const WATER_LEVEL = 1.2;
export const TERRAIN_EXTENT = 300;
export const TERRAIN_RESOLUTION = 256;

type Vec3 = [number, number, number];

const CAMERA_UNIFORMS_WGSL = /* wgsl */ `
struct CamUniforms {
  viewProj: mat4x4<f32>,
  eye: vec4<f32>,
  fwd: vec4<f32>,
  right: vec4<f32>,
  up: vec4<f32>,
  sun: vec4<f32>,
  params: vec4<f32>,
}
`;

const TERRAIN_GENERATE_SHADER = /* wgsl */ `
${CAMERA_UNIFORMS_WGSL}
@group(0) @binding(0) var<uniform> u: CamUniforms;
@group(0) @binding(1) var field: texture_storage_2d<rgba16float, write>;

fn hash(p: vec2<f32>) -> f32 {
  let d = dot(p, vec2<f32>(127.1, 311.7));
  return fract(sin(d) * 43758.5453123);
}
fn noise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let t = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2<f32>(1.0, 0.0)), t.x),
    mix(hash(i + vec2<f32>(0.0, 1.0)), hash(i + vec2<f32>(1.0, 1.0)), t.x),
    t.y
  );
}
fn fbm(p: vec2<f32>) -> f32 {
  var v = 0.0;
  var amp = 0.5;
  var q = p;
  for (var i = 0; i < 5; i = i + 1) {
    v += amp * noise(q);
    q = q * 2.13 + vec2<f32>(3.7, 9.1);
    amp *= 0.5;
  }
  return v;
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let res = u32(u.params.w);
  if (id.x >= res || id.y >= res) { return; }
  let extent = u.params.z;
  let uv = (vec2<f32>(id.xy) + 0.5) / vec2<f32>(f32(res));
  let p = (uv - vec2<f32>(0.5)) * extent;
  let dist = length(p);

  // A small island: a rounded cone that dips into the sea far out.
  let r = 52.0;
  let shore = smoothstep(r, r * 0.55, dist);
  let base = mix(-5.5, 1.6, shore);
  let crest = fbm(p * 0.045 + vec2<f32>(11.3, -4.7));
  let detail = noise(p * 0.5) * 0.35 + noise(p * 1.7) * 0.12;
  let height = base + (crest - 0.5) * 2.6 * shore + detail * shore;

  // Finite-difference normal in world units.
  let spacing = extent / f32(res - 1u);
  let hl = height + (fbm((p - vec2<f32>(spacing, 0.0)) * 0.045 + vec2<f32>(11.3, -4.7)) - 0.5) * 2.6 * shore;
  let hr = height + (fbm((p + vec2<f32>(spacing, 0.0)) * 0.045 + vec2<f32>(11.3, -4.7)) - 0.5) * 2.6 * shore;
  let hb = height + (fbm((p - vec2<f32>(0.0, spacing)) * 0.045 + vec2<f32>(11.3, -4.7)) - 0.5) * 2.6 * shore;
  let hf = height + (fbm((p + vec2<f32>(0.0, spacing)) * 0.045 + vec2<f32>(11.3, -4.7)) - 0.5) * 2.6 * shore;
  let n = normalize(vec3<f32>(hl - hr, 2.0 * spacing, hb - hf));

  let wl = u.params.y;
  var material = 0.0;
  if (height < wl - 0.3) { material = 0.0; }
  else if (height < wl + 0.35) { material = 1.0; }
  else if (height < wl + 2.6) { material = 2.0; }
  else if (height < wl + 8.0) { material = 3.0; }
  else { material = 4.0; }

  textureStore(field, vec2<i32>(id.xy), vec4<f32>(height, n.x, n.z, material));
}
`;

const TERRAIN_SCULPT_SHADER = /* wgsl */ `
${CAMERA_UNIFORMS_WGSL}
struct Brush {
  center: vec2<f32>,
  radius: f32,
  strength: f32,
}
@group(0) @binding(0) var<uniform> u: CamUniforms;
@group(0) @binding(1) var<uniform> brush: Brush;
@group(0) @binding(2) var terrainIn: texture_2d<f32>;
@group(0) @binding(3) var scratch: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let res = u32(u.params.w);
  if (id.x >= res || id.y >= res) { return; }
  let extent = u.params.z;
  let uv = (vec2<f32>(id.xy) + 0.5) / vec2<f32>(f32(res));
  let p = (uv - vec2<f32>(0.5)) * extent;
  let d = distance(p, brush.center);
  let falloff = smoothstep(brush.radius, brush.radius * 0.15, d);
  let old = textureLoad(terrainIn, vec2<i32>(id.xy), 0);
  let height = clamp(old.r + brush.strength * falloff, -8.0, 14.0);
  textureStore(scratch, vec2<i32>(id.xy), vec4<f32>(height, 0.0, 0.0, 0.0));
}
`;

const TERRAIN_NORMAL_REBUILD_SHADER = /* wgsl */ `
${CAMERA_UNIFORMS_WGSL}
@group(0) @binding(0) var<uniform> u: CamUniforms;
@group(0) @binding(1) var scratch: texture_2d<f32>;
@group(0) @binding(2) var field: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let res = u32(u.params.w);
  if (id.x >= res || id.y >= res) { return; }
  let coord = vec2<i32>(id.xy);
  let extent = u.params.z;
  let spacing = extent / f32(res - 1u);
  let maxC = vec2<i32>(res - 1u);
  let height = textureLoad(scratch, coord, 0).r;
  let left = textureLoad(scratch, clamp(coord + vec2<i32>(-1, 0), vec2<i32>(0), maxC), 0).r;
  let right = textureLoad(scratch, clamp(coord + vec2<i32>(1, 0), vec2<i32>(0), maxC), 0).r;
  let back = textureLoad(scratch, clamp(coord + vec2<i32>(0, -1), vec2<i32>(0), maxC), 0).r;
  let front = textureLoad(scratch, clamp(coord + vec2<i32>(0, 1), vec2<i32>(0), maxC), 0).r;
  let n = normalize(vec3<f32>(left - right, 2.0 * spacing, back - front));
  let wl = u.params.y;
  var material = 0.0;
  if (height < wl - 0.3) { material = 0.0; }
  else if (height < wl + 0.35) { material = 1.0; }
  else if (height < wl + 2.6) { material = 2.0; }
  else if (height < wl + 8.0) { material = 3.0; }
  else { material = 4.0; }
  textureStore(field, coord, vec4<f32>(height, n.x, n.z, material));
}
`;

const SKY_SHADER = /* wgsl */ `
${CAMERA_UNIFORMS_WGSL}
struct VsOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) ray: vec3<f32>,
}
@group(0) @binding(0) var<uniform> u: CamUniforms;

@vertex
fn vs(@builtin(vertex_index) idx: u32) -> VsOut {
  let verts = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0),
  );
  let pos = verts[idx];
  var out: VsOut;
  out.pos = vec4<f32>(pos, 0.0, 1.0);
  out.ray = normalize(u.fwd.xyz + u.right.xyz * pos.x + u.up.xyz * pos.y);
  return out;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4<f32> {
  let d = normalize(in.ray);
  let horizon = 0.035;
  let upMix = smoothstep(-0.05, horizon, d.y);
  let top = vec3<f32>(0.29, 0.52, 0.88);
  let horizonColor = vec3<f32>(0.86, 0.90, 0.94);
  var col = mix(horizonColor, top, upMix);
  // subtle warm band near the horizon
  col = mix(col, vec3<f32>(1.0, 0.94, 0.84), smoothstep(-0.05, 0.03, d.y) * (1.0 - smoothstep(0.03, 0.12, d.y)));
  // sun disc + glow
  let s = normalize(u.sun.xyz);
  let sunDot = dot(d, s);
  let glow = pow(max(sunDot, 0.0), 400.0) * 1.4 + pow(max(sunDot, 0.0), 12.0) * 0.12;
  col += vec3<f32>(1.0, 0.95, 0.85) * glow;
  // below-horizon is deep sea silhouette
  let below = smoothstep(horizon, -0.18, d.y);
  col = mix(col, vec3<f32>(0.06, 0.16, 0.20), below);
  return vec4<f32>(col, 1.0);
}
`;

const TERRAIN_RENDER_SHADER = /* wgsl */ `
${CAMERA_UNIFORMS_WGSL}
@group(0) @binding(0) var<uniform> u: CamUniforms;
@group(0) @binding(1) var terrain: texture_2d<f32>;
@group(0) @binding(2) var sampler0: sampler;

struct VsIn {
  @location(0) pos: vec2<f32>,
}
struct VsOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) uv: vec2<f32>,
}
@vertex
fn vs(in: VsIn) -> VsOut {
  var out: VsOut;
  let extent = u.params.z;
  let res = u.params.w;
  out.uv = in.pos / extent + vec2<f32>(0.5);
  // WebGPU forbids filtered sampling in the vertex stage, so read the height
  // field with a nearest texel fetch here; the fragment still uses the sampler.
  let texel = vec2<i32>(clamp(out.uv * vec2<f32>(f32(res) - 1.0), vec2<f32>(0.0), vec2<f32>(f32(res) - 1.0)));
  let h = textureLoad(terrain, texel, 0).r;
  let wp = vec3<f32>(in.pos.x, h, in.pos.y);
  out.worldPos = wp;
  out.pos = u.viewProj * vec4<f32>(wp, 1.0);
  return out;
}

fn palette(material: f32) -> vec3<f32> {
  let deep = vec3<f32>(0.42, 0.36, 0.26);
  let wet = vec3<f32>(0.74, 0.64, 0.44);
  let grass = vec3<f32>(0.32, 0.55, 0.28);
  let rock = vec3<f32>(0.52, 0.50, 0.47);
  let snow = vec3<f32>(0.96, 0.97, 0.98);
  let mats = array<vec3<f32>, 5>(deep, wet, grass, rock, snow);
  let i = clamp(i32(round(material)), 0, 4);
  return mats[i];
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4<f32> {
  let sample = textureSample(terrain, sampler0, in.uv);
  let n = normalize(vec3<f32>(sample.g, sqrt(max(1.0 - sample.g * sample.g - sample.b * sample.b, 0.0001)), sample.b));
  let sun = normalize(u.sun.xyz);
  let diffuse = max(dot(n, sun), 0.0);
  let sky = vec3<f32>(0.45, 0.66, 0.92);
  let base = palette(sample.a);
  let col = base * (0.32 + diffuse * 0.75) + sky * 0.1 * (1.0 - diffuse * 0.6);
  return vec4<f32>(col, 1.0);
}
`;

const WATER_SHADER = /* wgsl */ `
${CAMERA_UNIFORMS_WGSL}
@group(0) @binding(0) var<uniform> u: CamUniforms;
@group(0) @binding(1) var terrain: texture_2d<f32>;
@group(0) @binding(2) var sampler0: sampler;

struct VsIn {
  @location(0) offset: vec2<f32>,
}
struct VsOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) ndcDepth: f32,
}
fn waveHeight(p: vec2<f32>, t: f32) -> f32 {
  var h = 0.0;
  h += sin(p.x * 0.12 + t * 0.9) * 0.16;
  h += sin(p.x * 0.07 - p.y * 0.09 + t * 0.7) * 0.22;
  h += sin(dot(p, vec2<f32>(0.13, 0.11)) + t * 1.05) * 0.1;
  h += sin(p.y * 0.16 + t * 0.8) * 0.08;
  return h;
}
@vertex
fn vs(in: VsIn) -> VsOut {
  var out: VsOut;
  let wp = vec3<f32>(u.eye.x + in.offset.x, u.params.y, u.eye.z + in.offset.y);
  let h = waveHeight(wp.xz, u.params.x);
  let y = wp.y + h;
  out.worldPos = vec3<f32>(wp.x, y, wp.z);
  let extent = u.params.z;
  out.uv = (wp.xz / extent) + vec2<f32>(0.5);
  out.pos = u.viewProj * vec4<f32>(out.worldPos, 1.0);
  out.ndcDepth = out.pos.z / out.pos.w;
  return out;
}
@fragment
fn fs(in: VsOut) -> @location(0) vec4<f32> {
  let px = dFdx(in.worldPos);
  let py = dFdy(in.worldPos);
  let n = normalize(cross(px, py));
  let view = normalize(u.eye.xyz - in.worldPos);
  let sun = normalize(u.sun.xyz);
  let cosTheta = max(dot(n, view), 0.0);
  let fresnel = 0.02 + 0.98 * pow(1.0 - cosTheta, 5.0);
  // reflected sky approximated from the view ray
  let refl = normalize(reflect(-view, n));
  let skyRefl = mix(vec3<f32>(0.30, 0.50, 0.80), vec3<f32>(0.92, 0.95, 0.98), smoothstep(-0.08, 0.3, refl.y))
    + vec3<f32>(1.0, 0.92, 0.78) * pow(max(dot(refl, sun), 0.0), 420.0) * 0.8;
  let depth = clamp(u.params.y - textureSampleLevel(terrain, sampler0, in.uv, 0.0).r, 0.0, 12.0);
  let shallow = vec3<f32>(0.14, 0.52, 0.52);
  let deep = vec3<f32>(0.02, 0.12, 0.17);
  let water = mix(shallow, deep, clamp(depth / 12.0, 0.0, 1.0));
  var col = mix(water, skyRefl, fresnel * 0.9);
  let spec = pow(max(dot(reflect(sun, n), view), 0.0), 160.0) * 0.9;
  col += vec3<f32>(1.0, 0.96, 0.88) * spec;
  // fade into the sky toward the horizon
  let dist = length(in.worldPos - u.eye.xyz);
  let fog = smoothstep(90.0, 400.0, dist);
  let horizonSky = mix(vec3<f32>(0.86, 0.90, 0.94), vec3<f32>(1.0, 0.94, 0.84), 0.4);
  col = mix(col, horizonSky, fog);
  return vec4<f32>(col, 1.0);
}
`;

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function lookAt(eye: Vec3, target: Vec3): Float32Array {
  const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = normalize(cross([0, 1, 0], z));
  const y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ]);
}
function perspective(fovRadians: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovRadians / 2);
  return new Float32Array([
    f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, far / (near - far), -1, 0, 0, (near * far) / (near - far), 0,
  ]);
}
function multiply(left: Float32Array, right: Float32Array): Float32Array {
  const output = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      output[column * 4 + row] = left[row] * right[column * 4] + left[4 + row] * right[column * 4 + 1] + left[8 + row] * right[column * 4 + 2] + left[12 + row] * right[column * 4 + 3];
    }
  }
  return output;
}

export type TinyWorldOptions = {
  meshResolution?: number;
  renderScale?: number;
  cameraYaw?: number;
  cameraPitch?: number;
  cameraRadius?: number;
};

export class TinyWorldEngine {
  private canvas: HTMLCanvasElement;
  private options: Required<Pick<TinyWorldOptions, "meshResolution" | "renderScale">> & TinyWorldOptions;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = "bgra8unorm";
  private depthTexture: GPUTexture | null = null;

  private uniformBuffer: GPUBuffer | null = null;
  private brushBuffer: GPUBuffer | null = null;
  private terrainTexture: GPUTexture | null = null;
  private scratchTexture: GPUTexture | null = null;
  private terrainSampler: GPUSampler | null = null;

  private generatePipeline: GPUComputePipeline | null = null;
  private sculptPipeline: GPUComputePipeline | null = null;
  private normalRebuildPipeline: GPUComputePipeline | null = null;
  private generateBindGroup: GPUBindGroup | null = null;
  private sculptBindGroup: GPUBindGroup | null = null;
  private normalRebuildBindGroup: GPUBindGroup | null = null;

  private skyPipeline: GPURenderPipeline | null = null;
  private terrainPipeline: GPURenderPipeline | null = null;
  private waterPipeline: GPURenderPipeline | null = null;
  private skyBindGroup: GPUBindGroup | null = null;
  private terrainBindGroup: GPUBindGroup | null = null;
  private waterBindGroup: GPUBindGroup | null = null;

  private terrainVertexBuffer: GPUBuffer | null = null;
  private terrainIndexBuffer: GPUBuffer | null = null;
  private terrainIndexCount = 0;
  private waterVertexBuffer: GPUBuffer | null = null;
  private waterIndexBuffer: GPUBuffer | null = null;
  private waterIndexCount = 0;

  private yaw = 0.8;
  private pitch = 0.45;
  private radius = 120;
  private fovDeg = 45;

  private startTime = performance.now();
  private elapsedSeconds = 0;
  private disposed = false;
  private terrainPrepared = false;
  private pendingBrushes: { x: number; z: number; radius: number; strength: number }[] = [];

  private pointer: { id: number; x: number; y: number; button: number } | null = null;
  private sculptPointer: { id: number; button: number } | null = null;

  constructor(canvas: HTMLCanvasElement, options: TinyWorldOptions = {}) {
    this.canvas = canvas;
    this.options = { meshResolution: options.meshResolution ?? 128, renderScale: options.renderScale ?? 1, ...options };
    if (Number.isFinite(options.cameraYaw)) this.yaw = options.cameraYaw!;
    if (Number.isFinite(options.cameraPitch)) this.pitch = Math.max(0.05, Math.min(1.3, options.cameraPitch!));
    if (Number.isFinite(options.cameraRadius)) this.radius = options.cameraRadius!;
  }

  async init() {
    if (!navigator.gpu) throw new Error("WebGPU is unavailable.");
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) throw new Error("No WebGPU adapter.");
    this.device = await adapter.requestDevice();
    this.device.onuncapturederror = (event) => {
      console.error("tiny world GPU error:", event.error);
      this.onError?.(event.error?.message ?? "GPU error");
    };
    this.context = this.canvas.getContext("webgpu") as GPUCanvasContext | null;
    if (!this.context) throw new Error("No webgpu context.");
    this.format = "bgra8unorm";
    this.context.configure({ device: this.device, format: this.format, alphaMode: "opaque" });

    this.allocateResources();
    this.installInteraction();
    this.resize(true);
    requestAnimationFrame(this.render);
  }

  /** Optional callback so the host can surface GPU diagnostics. */
  onError: ((message: string) => void) | null = null;

  private allocateResources() {
    const device = this.device!;
    const res = TERRAIN_RESOLUTION;
    const terrainSize = res + 1;

    this.uniformBuffer = device.createBuffer({ label: "tiny world uniforms", size: 192, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.brushBuffer = device.createBuffer({ label: "tiny world brush", size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.terrainTexture = device.createTexture({
      label: "tiny world terrain",
      size: [terrainSize, terrainSize],
      format: "rgba16float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.scratchTexture = device.createTexture({
      label: "tiny world terrain scratch",
      size: [terrainSize, terrainSize],
      format: "rgba16float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.terrainSampler = device.createSampler({ magFilter: "linear", minFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });

    const [generateModule, sculptModule, normalModule, skyModule, terrainRenderModule, waterModule] = ["generate", "sculpt", "normal", "sky", "terrainRender", "water"].map((label) => {
      const source = label === "generate" ? TERRAIN_GENERATE_SHADER : label === "sculpt" ? TERRAIN_SCULPT_SHADER : label === "normal" ? TERRAIN_NORMAL_REBUILD_SHADER : label === "sky" ? SKY_SHADER : label === "terrainRender" ? TERRAIN_RENDER_SHADER : WATER_SHADER;
      return device.createShaderModule({ label: `tiny world ${label}`, code: source });
    });

    this.generatePipeline = device.createComputePipeline({ label: "tiny world terrain generate", layout: "auto", compute: { module: generateModule, entryPoint: "main" } });
    this.sculptPipeline = device.createComputePipeline({ label: "tiny world sculpt", layout: "auto", compute: { module: sculptModule, entryPoint: "main" } });
    this.normalRebuildPipeline = device.createComputePipeline({ label: "tiny world normal rebuild", layout: "auto", compute: { module: normalModule, entryPoint: "main" } });

    this.generateBindGroup = device.createBindGroup({ label: "tiny world generate", layout: this.generatePipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }, { binding: 1, resource: this.terrainTexture.createView() }] });
    this.sculptBindGroup = device.createBindGroup({ label: "tiny world sculpt", layout: this.sculptPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: this.uniformBuffer } },
      { binding: 1, resource: { buffer: this.brushBuffer } },
      { binding: 2, resource: this.terrainTexture.createView() },
      { binding: 3, resource: this.scratchTexture.createView() },
    ] });
    this.normalRebuildBindGroup = device.createBindGroup({ label: "tiny world normal rebuild", layout: this.normalRebuildPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: this.uniformBuffer } },
      { binding: 1, resource: this.scratchTexture.createView() },
      { binding: 2, resource: this.terrainTexture.createView() },
    ] });

    this.skyPipeline = device.createRenderPipeline({
      label: "tiny world sky",
      layout: "auto",
      vertex: { module: skyModule, entryPoint: "vs" },
      fragment: { module: skyModule, entryPoint: "fs", targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { format: "depth24plus", depthWriteEnabled: false, depthCompare: "always" },
    });
    this.skyBindGroup = device.createBindGroup({ label: "tiny world sky", layout: this.skyPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }] });

    this.terrainPipeline = device.createRenderPipeline({
      label: "tiny world terrain render",
      layout: "auto",
      vertex: { module: terrainRenderModule, entryPoint: "vs", buffers: [{ arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] }] },
      fragment: { module: terrainRenderModule, entryPoint: "fs", targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" },
    });
    this.terrainBindGroup = device.createBindGroup({ label: "tiny world terrain", layout: this.terrainPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: this.uniformBuffer } },
      { binding: 1, resource: this.terrainTexture.createView() },
      { binding: 2, resource: this.terrainSampler },
    ] });

    this.waterPipeline = device.createRenderPipeline({
      label: "tiny world water",
      layout: "auto",
      vertex: { module: waterModule, entryPoint: "vs", buffers: [{ arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] }] },
      fragment: { module: waterModule, entryPoint: "fs", targets: [{ format: this.format, blend: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } } }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" },
    });
    this.waterBindGroup = device.createBindGroup({ label: "tiny world water", layout: this.waterPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: this.uniformBuffer } },
      { binding: 1, resource: this.terrainTexture.createView() },
      { binding: 2, resource: this.terrainSampler },
    ] });

    this.buildTerrainGrid();
    this.buildWaterGrid();
  }

  private buildTerrainGrid() {
    const device = this.device!;
    const n = this.options.meshResolution;
    const extent = TERRAIN_EXTENT;
    const positions = new Float32Array((n + 1) * (n + 1) * 2);
    for (let y = 0; y <= n; y++) {
      for (let x = 0; x <= n; x++) {
        const i = (y * (n + 1) + x) * 2;
        positions[i] = (x / n - 0.5) * extent;
        positions[i + 1] = (y / n - 0.5) * extent;
      }
    }
    const indices = new Uint32Array(n * n * 6);
    let w = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const a = y * (n + 1) + x;
        const b = a + 1;
        const c = a + (n + 1);
        const d = c + 1;
        indices[w++] = a; indices[w++] = c; indices[w++] = b;
        indices[w++] = b; indices[w++] = c; indices[w++] = d;
      }
    }
    this.terrainVertexBuffer = device.createBuffer({ label: "tiny world terrain verts", size: positions.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.terrainIndexBuffer = device.createBuffer({ label: "tiny world terrain indices", size: indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(this.terrainVertexBuffer, 0, positions);
    device.queue.writeBuffer(this.terrainIndexBuffer, 0, indices);
    this.terrainIndexCount = indices.length;
  }

  private buildWaterGrid() {
    const device = this.device!;
    const n = 150;
    const extent = 420;
    const positions = new Float32Array((n + 1) * (n + 1) * 2);
    for (let y = 0; y <= n; y++) {
      for (let x = 0; x <= n; x++) {
        const i = (y * (n + 1) + x) * 2;
        positions[i] = (x / n - 0.5) * extent;
        positions[i + 1] = (y / n - 0.5) * extent;
      }
    }
    const indices = new Uint32Array(n * n * 6);
    let w = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const a = y * (n + 1) + x;
        const b = a + 1;
        const c = a + (n + 1);
        const d = c + 1;
        indices[w++] = a; indices[w++] = c; indices[w++] = b;
        indices[w++] = b; indices[w++] = c; indices[w++] = d;
      }
    }
    this.waterVertexBuffer = device.createBuffer({ label: "tiny world water verts", size: positions.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.waterIndexBuffer = device.createBuffer({ label: "tiny world water indices", size: indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(this.waterVertexBuffer, 0, positions);
    device.queue.writeBuffer(this.waterIndexBuffer, 0, indices);
    this.waterIndexCount = indices.length;
  }

  private resize(force = false) {
    const device = this.device;
    if (!device) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * this.options.renderScale;
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (!force && this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.depthTexture?.destroy();
    this.depthTexture = device.createTexture({ label: "tiny world depth", size: [width, height], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
  }

  private frameState(timestamp: number) {
    this.elapsedSeconds = (timestamp - this.startTime) / 1000;
    const target: Vec3 = [0, 0, 0];
    const horizontal = Math.cos(this.pitch) * this.radius;
    const vertical = Math.sin(this.pitch) * this.radius;
    const eye: Vec3 = [target[0] + Math.sin(this.yaw) * horizontal, target[1] + vertical, target[2] + Math.cos(this.yaw) * horizontal];
    const forward = normalize([target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]]);
    const right = normalize(cross(forward, [0, 1, 0]));
    const up = normalize(cross(right, forward));
    const projection = perspective((this.fovDeg * Math.PI) / 180, this.canvas.width / this.canvas.height, 0.3, 1600);
    const view = lookAt(eye, target);
    const tanHalfFov = Math.tan((this.fovDeg * Math.PI) / 360);
    return { eye, forward, right, up, viewProj: multiply(projection, view), tanHalfFov, aspect: this.canvas.width / this.canvas.height };
  }

  private writeUniforms(frame: ReturnType<TinyWorldEngine["frameState"]>) {
    const values = new Float32Array(48);
    values.set(frame.viewProj, 0);
    values.set([...frame.eye, 0], 16);
    values.set([...frame.forward, frame.tanHalfFov], 20);
    values.set([...frame.right, frame.tanHalfFov * frame.aspect], 24);
    values.set([...frame.up, 0], 28);
    values.set([...normalize([-0.5, 0.62, -0.7]), 1], 32);
    values.set([this.elapsedSeconds, WATER_LEVEL, TERRAIN_EXTENT, TERRAIN_RESOLUTION + 1], 36);
    this.device!.queue.writeBuffer(this.uniformBuffer!, 0, values);
  }

  private render = (timestamp: number) => {
    if (this.disposed || !this.device || !this.context) return;
    try {
      const frame = this.frameState(timestamp);
      this.writeUniforms(frame);
      const encoder = this.device.createCommandEncoder({ label: "tiny world frame" });
      const res = TERRAIN_RESOLUTION + 1;
      const workgroups = Math.ceil(res / 16);

      if (!this.terrainPrepared) {
        const pass = encoder.beginComputePass({ label: "tiny world generate" });
        pass.setPipeline(this.generatePipeline!);
        pass.setBindGroup(0, this.generateBindGroup!);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
        this.terrainPrepared = true;
      }
      if (this.pendingBrushes.length > 0) {
        const brushes = this.pendingBrushes;
        this.pendingBrushes = [];
        for (const brush of brushes) {
          this.device.queue.writeBuffer(this.brushBuffer!, 0, new Float32Array([brush.x, brush.z, brush.radius, brush.strength]));
          const pass = encoder.beginComputePass({ label: "tiny world sculpt" });
          pass.setPipeline(this.sculptPipeline!);
          pass.setBindGroup(0, this.sculptBindGroup!);
          pass.dispatchWorkgroups(workgroups, workgroups);
          pass.end();
        }
        const pass = encoder.beginComputePass({ label: "tiny world normal rebuild" });
        pass.setPipeline(this.normalRebuildPipeline!);
        pass.setBindGroup(0, this.normalRebuildBindGroup!);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
      }

      const render = encoder.beginRenderPass({
        label: "tiny world render",
        colorAttachments: [{ view: this.context.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0.1, g: 0.18, b: 0.25, a: 1 } }],
        depthStencilAttachment: { view: this.depthTexture!.createView(), depthLoadOp: "clear", depthStoreOp: "store", depthClearValue: 1 },
      });
      render.setPipeline(this.skyPipeline!);
      render.setBindGroup(0, this.skyBindGroup!);
      render.draw(3);
      render.setPipeline(this.terrainPipeline!);
      render.setBindGroup(0, this.terrainBindGroup!);
      render.setVertexBuffer(0, this.terrainVertexBuffer!);
      render.setIndexBuffer(this.terrainIndexBuffer!, "uint32");
      render.drawIndexed(this.terrainIndexCount);
      render.setPipeline(this.waterPipeline!);
      render.setBindGroup(0, this.waterBindGroup!);
      render.setVertexBuffer(0, this.waterVertexBuffer!);
      render.setIndexBuffer(this.waterIndexBuffer!, "uint32");
      render.drawIndexed(this.waterIndexCount);
      render.end();

      this.device.queue.submit([encoder.finish()]);
    } catch (error) {
      console.error("tiny world frame failed:", error);
      this.onError?.(error instanceof Error ? error.message : String(error));
    }
    requestAnimationFrame(this.render);
  };

  private installInteraction() {
    const canvas = this.canvas;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => this.resize();

  private onPointerDown = (event: PointerEvent) => {
    this.canvas.setPointerCapture(event.pointerId);
    if (event.button === 2) {
      this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, button: 2 };
      return;
    }
    this.sculptPointer = { id: event.pointerId, button: event.button };
    this.applyBrush(event.clientX, event.clientY, event.shiftKey);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.pointer?.id === event.pointerId) {
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.yaw -= dx * 0.005;
      this.pitch = Math.max(0.05, Math.min(1.3, this.pitch + dy * 0.004));
      return;
    }
    if (this.sculptPointer?.id === event.pointerId) {
      this.applyBrush(event.clientX, event.clientY, event.shiftKey);
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.pointer?.id === event.pointerId) this.pointer = null;
    if (this.sculptPointer?.id === event.pointerId) this.sculptPointer = null;
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    this.radius = Math.max(38, Math.min(420, this.radius * Math.exp(event.deltaY * 0.001)));
  };

  private pointerRaycast(clientX: number, clientY: number): { x: number; z: number } | null {
    const frame = this.frameState(performance.now());
    const ndcX = (clientX / this.canvas.clientWidth) * 2 - 1;
    const ndcY = 1 - (clientY / this.canvas.clientHeight) * 2;
    const dir = normalize([
      frame.forward[0] + frame.right[0] * ndcX * frame.tanHalfFov * frame.aspect + frame.up[0] * ndcY * frame.tanHalfFov,
      frame.forward[1] + frame.right[1] * ndcX * frame.tanHalfFov * frame.aspect + frame.up[1] * ndcY * frame.tanHalfFov,
      frame.forward[2] + frame.right[2] * ndcX * frame.tanHalfFov * frame.aspect + frame.up[2] * ndcY * frame.tanHalfFov,
    ]);
    const t = (WATER_LEVEL - frame.eye[1]) / dir[1];
    if (t <= 0) return null;
    return { x: frame.eye[0] + dir[0] * t, z: frame.eye[2] + dir[2] * t };
  }

  private applyBrush(clientX: number, clientY: number, lower: boolean) {
    if (!this.terrainPrepared) return;
    const hit = this.pointerRaycast(clientX, clientY);
    if (!hit) return;
    const radius = 14;
    const strength = lower ? -0.09 : 0.09;
    this.pendingBrushes.push({ x: hit.x, z: hit.z, radius, strength });
    if (this.pendingBrushes.length > 64) this.pendingBrushes.shift();
  }

  dispose() {
    this.disposed = true;
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("resize", this.onResize);
  }
}
