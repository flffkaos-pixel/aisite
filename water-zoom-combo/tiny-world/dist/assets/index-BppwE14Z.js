(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=1.2,t=`
struct CamUniforms {
  viewProj: mat4x4<f32>,
  eye: vec4<f32>,
  fwd: vec4<f32>,
  right: vec4<f32>,
  up: vec4<f32>,
  sun: vec4<f32>,
  params: vec4<f32>,
}
`,n=`
${t}
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
`,r=`
${t}
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
`,i=`
${t}
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
`,a=`
${t}
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
`,o=`
${t}
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
`,s=`
${t}
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
`;function c(e){let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}function l(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function u(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function d(e,t){let n=c([e[0]-t[0],e[1]-t[1],e[2]-t[2]]),r=c(l([0,1,0],n)),i=l(n,r);return new Float32Array([r[0],i[0],n[0],0,r[1],i[1],n[1],0,r[2],i[2],n[2],0,-u(r,e),-u(i,e),-u(n,e),1])}function f(e,t,n,r){let i=1/Math.tan(e/2);return new Float32Array([i/t,0,0,0,0,i,0,0,0,0,r/(n-r),-1,0,0,n*r/(n-r),0])}function p(e,t){let n=new Float32Array(16);for(let r=0;r<4;r+=1)for(let i=0;i<4;i+=1)n[r*4+i]=e[i]*t[r*4]+e[4+i]*t[r*4+1]+e[8+i]*t[r*4+2]+e[12+i]*t[r*4+3];return n}var m=class{canvas;options;device=null;context=null;format=`bgra8unorm`;depthTexture=null;uniformBuffer=null;brushBuffer=null;terrainTexture=null;scratchTexture=null;terrainSampler=null;generatePipeline=null;sculptPipeline=null;normalRebuildPipeline=null;generateBindGroup=null;sculptBindGroup=null;normalRebuildBindGroup=null;skyPipeline=null;terrainPipeline=null;waterPipeline=null;skyBindGroup=null;terrainBindGroup=null;waterBindGroup=null;terrainVertexBuffer=null;terrainIndexBuffer=null;terrainIndexCount=0;waterVertexBuffer=null;waterIndexBuffer=null;waterIndexCount=0;yaw=.8;pitch=.45;radius=120;fovDeg=45;startTime=performance.now();elapsedSeconds=0;disposed=!1;terrainPrepared=!1;pendingBrushes=[];pointer=null;sculptPointer=null;constructor(e,t={}){this.canvas=e,this.options={meshResolution:t.meshResolution??128,renderScale:t.renderScale??1,...t},Number.isFinite(t.cameraYaw)&&(this.yaw=t.cameraYaw),Number.isFinite(t.cameraPitch)&&(this.pitch=Math.max(.05,Math.min(1.3,t.cameraPitch))),Number.isFinite(t.cameraRadius)&&(this.radius=t.cameraRadius)}async init(){if(!navigator.gpu)throw Error(`WebGPU is unavailable.`);let e=await navigator.gpu.requestAdapter({powerPreference:`high-performance`});if(!e)throw Error(`No WebGPU adapter.`);if(this.device=await e.requestDevice(),this.device.onuncapturederror=e=>{console.error(`tiny world GPU error:`,e.error),this.onError?.(e.error?.message??`GPU error`)},this.context=this.canvas.getContext(`webgpu`),!this.context)throw Error(`No webgpu context.`);this.format=`bgra8unorm`,this.context.configure({device:this.device,format:this.format,alphaMode:`opaque`}),this.allocateResources(),this.installInteraction(),this.resize(!0),requestAnimationFrame(this.render)}onError=null;allocateResources(){let e=this.device;this.uniformBuffer=e.createBuffer({label:`tiny world uniforms`,size:192,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.brushBuffer=e.createBuffer({label:`tiny world brush`,size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.terrainTexture=e.createTexture({label:`tiny world terrain`,size:[257,257],format:`rgba16float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING}),this.scratchTexture=e.createTexture({label:`tiny world terrain scratch`,size:[257,257],format:`rgba16float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING}),this.terrainSampler=e.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`});let[t,c,l,u,d,f]=[`generate`,`sculpt`,`normal`,`sky`,`terrainRender`,`water`].map(t=>{let c=t===`generate`?n:t===`sculpt`?r:t===`normal`?i:t===`sky`?a:t===`terrainRender`?o:s;return e.createShaderModule({label:`tiny world ${t}`,code:c})});this.generatePipeline=e.createComputePipeline({label:`tiny world terrain generate`,layout:`auto`,compute:{module:t,entryPoint:`main`}}),this.sculptPipeline=e.createComputePipeline({label:`tiny world sculpt`,layout:`auto`,compute:{module:c,entryPoint:`main`}}),this.normalRebuildPipeline=e.createComputePipeline({label:`tiny world normal rebuild`,layout:`auto`,compute:{module:l,entryPoint:`main`}}),this.generateBindGroup=e.createBindGroup({label:`tiny world generate`,layout:this.generatePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBuffer}},{binding:1,resource:this.terrainTexture.createView()}]}),this.sculptBindGroup=e.createBindGroup({label:`tiny world sculpt`,layout:this.sculptPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBuffer}},{binding:1,resource:{buffer:this.brushBuffer}},{binding:2,resource:this.terrainTexture.createView()},{binding:3,resource:this.scratchTexture.createView()}]}),this.normalRebuildBindGroup=e.createBindGroup({label:`tiny world normal rebuild`,layout:this.normalRebuildPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBuffer}},{binding:1,resource:this.scratchTexture.createView()},{binding:2,resource:this.terrainTexture.createView()}]}),this.skyPipeline=e.createRenderPipeline({label:`tiny world sky`,layout:`auto`,vertex:{module:u,entryPoint:`vs`},fragment:{module:u,entryPoint:`fs`,targets:[{format:this.format}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`}}),this.skyBindGroup=e.createBindGroup({label:`tiny world sky`,layout:this.skyPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBuffer}}]}),this.terrainPipeline=e.createRenderPipeline({label:`tiny world terrain render`,layout:`auto`,vertex:{module:d,entryPoint:`vs`,buffers:[{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:`float32x2`}]}]},fragment:{module:d,entryPoint:`fs`,targets:[{format:this.format}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`}}),this.terrainBindGroup=e.createBindGroup({label:`tiny world terrain`,layout:this.terrainPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBuffer}},{binding:1,resource:this.terrainTexture.createView()},{binding:2,resource:this.terrainSampler}]}),this.waterPipeline=e.createRenderPipeline({label:`tiny world water`,layout:`auto`,vertex:{module:f,entryPoint:`vs`,buffers:[{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:`float32x2`}]}]},fragment:{module:f,entryPoint:`fs`,targets:[{format:this.format,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`}}),this.waterBindGroup=e.createBindGroup({label:`tiny world water`,layout:this.waterPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBuffer}},{binding:1,resource:this.terrainTexture.createView()},{binding:2,resource:this.terrainSampler}]}),this.buildTerrainGrid(),this.buildWaterGrid()}buildTerrainGrid(){let e=this.device,t=this.options.meshResolution,n=new Float32Array((t+1)*(t+1)*2);for(let e=0;e<=t;e++)for(let r=0;r<=t;r++){let i=(e*(t+1)+r)*2;n[i]=(r/t-.5)*300,n[i+1]=(e/t-.5)*300}let r=new Uint32Array(t*t*6),i=0;for(let e=0;e<t;e++)for(let n=0;n<t;n++){let a=e*(t+1)+n,o=a+1,s=a+(t+1),c=s+1;r[i++]=a,r[i++]=s,r[i++]=o,r[i++]=o,r[i++]=s,r[i++]=c}this.terrainVertexBuffer=e.createBuffer({label:`tiny world terrain verts`,size:n.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),this.terrainIndexBuffer=e.createBuffer({label:`tiny world terrain indices`,size:r.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST}),e.queue.writeBuffer(this.terrainVertexBuffer,0,n),e.queue.writeBuffer(this.terrainIndexBuffer,0,r),this.terrainIndexCount=r.length}buildWaterGrid(){let e=this.device,t=new Float32Array(45602);for(let e=0;e<=150;e++)for(let n=0;n<=150;n++){let r=(e*151+n)*2;t[r]=(n/150-.5)*420,t[r+1]=(e/150-.5)*420}let n=new Uint32Array(135e3),r=0;for(let e=0;e<150;e++)for(let t=0;t<150;t++){let i=e*151+t,a=i+1,o=i+151,s=o+1;n[r++]=i,n[r++]=o,n[r++]=a,n[r++]=a,n[r++]=o,n[r++]=s}this.waterVertexBuffer=e.createBuffer({label:`tiny world water verts`,size:t.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),this.waterIndexBuffer=e.createBuffer({label:`tiny world water indices`,size:n.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST}),e.queue.writeBuffer(this.waterVertexBuffer,0,t),e.queue.writeBuffer(this.waterIndexBuffer,0,n),this.waterIndexCount=n.length}resize(e=!1){let t=this.device;if(!t)return;let n=Math.min(window.devicePixelRatio||1,1.5)*this.options.renderScale,r=Math.max(1,Math.floor(this.canvas.clientWidth*n)),i=Math.max(1,Math.floor(this.canvas.clientHeight*n));!e&&this.canvas.width===r&&this.canvas.height===i||(this.canvas.width=r,this.canvas.height=i,this.depthTexture?.destroy(),this.depthTexture=t.createTexture({label:`tiny world depth`,size:[r,i],format:`depth24plus`,usage:GPUTextureUsage.RENDER_ATTACHMENT}))}frameState(e){this.elapsedSeconds=(e-this.startTime)/1e3;let t=[0,0,0],n=Math.cos(this.pitch)*this.radius,r=Math.sin(this.pitch)*this.radius,i=[t[0]+Math.sin(this.yaw)*n,t[1]+r,t[2]+Math.cos(this.yaw)*n],a=c([t[0]-i[0],t[1]-i[1],t[2]-i[2]]),o=c(l(a,[0,1,0])),s=c(l(o,a)),u=f(this.fovDeg*Math.PI/180,this.canvas.width/this.canvas.height,.3,1600),m=d(i,t),h=Math.tan(this.fovDeg*Math.PI/360);return{eye:i,forward:a,right:o,up:s,viewProj:p(u,m),tanHalfFov:h,aspect:this.canvas.width/this.canvas.height}}writeUniforms(t){let n=new Float32Array(48);n.set(t.viewProj,0),n.set([...t.eye,0],16),n.set([...t.forward,t.tanHalfFov],20),n.set([...t.right,t.tanHalfFov*t.aspect],24),n.set([...t.up,0],28),n.set([...c([-.5,.62,-.7]),1],32),n.set([this.elapsedSeconds,e,300,257],36),this.device.queue.writeBuffer(this.uniformBuffer,0,n)}render=e=>{if(!(this.disposed||!this.device||!this.context)){try{let t=this.frameState(e);this.writeUniforms(t);let n=this.device.createCommandEncoder({label:`tiny world frame`});if(!this.terrainPrepared){let e=n.beginComputePass({label:`tiny world generate`});e.setPipeline(this.generatePipeline),e.setBindGroup(0,this.generateBindGroup),e.dispatchWorkgroups(17,17),e.end(),this.terrainPrepared=!0}if(this.pendingBrushes.length>0){let e=this.pendingBrushes;this.pendingBrushes=[];for(let t of e){this.device.queue.writeBuffer(this.brushBuffer,0,new Float32Array([t.x,t.z,t.radius,t.strength]));let e=n.beginComputePass({label:`tiny world sculpt`});e.setPipeline(this.sculptPipeline),e.setBindGroup(0,this.sculptBindGroup),e.dispatchWorkgroups(17,17),e.end()}let t=n.beginComputePass({label:`tiny world normal rebuild`});t.setPipeline(this.normalRebuildPipeline),t.setBindGroup(0,this.normalRebuildBindGroup),t.dispatchWorkgroups(17,17),t.end()}let r=n.beginRenderPass({label:`tiny world render`,colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:.1,g:.18,b:.25,a:1}}],depthStencilAttachment:{view:this.depthTexture.createView(),depthLoadOp:`clear`,depthStoreOp:`store`,depthClearValue:1}});r.setPipeline(this.skyPipeline),r.setBindGroup(0,this.skyBindGroup),r.draw(3),r.setPipeline(this.terrainPipeline),r.setBindGroup(0,this.terrainBindGroup),r.setVertexBuffer(0,this.terrainVertexBuffer),r.setIndexBuffer(this.terrainIndexBuffer,`uint32`),r.drawIndexed(this.terrainIndexCount),r.setPipeline(this.waterPipeline),r.setBindGroup(0,this.waterBindGroup),r.setVertexBuffer(0,this.waterVertexBuffer),r.setIndexBuffer(this.waterIndexBuffer,`uint32`),r.drawIndexed(this.waterIndexCount),r.end(),this.device.queue.submit([n.finish()])}catch(e){console.error(`tiny world frame failed:`,e),this.onError?.(e instanceof Error?e.message:String(e))}requestAnimationFrame(this.render)}};installInteraction(){let e=this.canvas;e.addEventListener(`pointerdown`,this.onPointerDown),e.addEventListener(`pointermove`,this.onPointerMove),e.addEventListener(`pointerup`,this.onPointerUp),e.addEventListener(`pointercancel`,this.onPointerUp),e.addEventListener(`wheel`,this.onWheel,{passive:!1}),window.addEventListener(`resize`,this.onResize)}onResize=()=>this.resize();onPointerDown=e=>{if(this.canvas.setPointerCapture(e.pointerId),e.button===2){this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,button:2};return}this.sculptPointer={id:e.pointerId,button:e.button},this.applyBrush(e.clientX,e.clientY,e.shiftKey)};onPointerMove=e=>{if(this.pointer?.id===e.pointerId){let t=e.clientX-this.pointer.x,n=e.clientY-this.pointer.y;this.pointer.x=e.clientX,this.pointer.y=e.clientY,this.yaw-=t*.005,this.pitch=Math.max(.05,Math.min(1.3,this.pitch+n*.004));return}this.sculptPointer?.id===e.pointerId&&this.applyBrush(e.clientX,e.clientY,e.shiftKey)};onPointerUp=e=>{this.pointer?.id===e.pointerId&&(this.pointer=null),this.sculptPointer?.id===e.pointerId&&(this.sculptPointer=null)};onWheel=e=>{e.preventDefault(),this.radius=Math.max(38,Math.min(420,this.radius*Math.exp(e.deltaY*.001)))};pointerRaycast(t,n){let r=this.frameState(performance.now()),i=t/this.canvas.clientWidth*2-1,a=1-n/this.canvas.clientHeight*2,o=c([r.forward[0]+r.right[0]*i*r.tanHalfFov*r.aspect+r.up[0]*a*r.tanHalfFov,r.forward[1]+r.right[1]*i*r.tanHalfFov*r.aspect+r.up[1]*a*r.tanHalfFov,r.forward[2]+r.right[2]*i*r.tanHalfFov*r.aspect+r.up[2]*a*r.tanHalfFov]),s=(e-r.eye[1])/o[1];return s<=0?null:{x:r.eye[0]+o[0]*s,z:r.eye[2]+o[2]*s}}applyBrush(e,t,n){if(!this.terrainPrepared)return;let r=this.pointerRaycast(e,t);if(!r)return;let i=n?-.09:.09;this.pendingBrushes.push({x:r.x,z:r.z,radius:14,strength:i}),this.pendingBrushes.length>64&&this.pendingBrushes.shift()}dispose(){this.disposed=!0,this.canvas.removeEventListener(`pointerdown`,this.onPointerDown),this.canvas.removeEventListener(`pointermove`,this.onPointerMove),this.canvas.removeEventListener(`pointerup`,this.onPointerUp),this.canvas.removeEventListener(`pointercancel`,this.onPointerUp),this.canvas.removeEventListener(`wheel`,this.onWheel),window.removeEventListener(`resize`,this.onResize)}},h=document.querySelector(`#app`),g=document.createElement(`canvas`);g.id=`world`,g.className=`full`,h.appendChild(g);var _=document.createElement(`div`);_.id=`status`,_.textContent=`loading WebGPU…`,h.appendChild(_);var v=new m(g,{meshResolution:128,renderScale:1,cameraYaw:.8,cameraPitch:.5,cameraRadius:130});v.onError=e=>{_.textContent=`WebGPU error: ${e}`},v.init().then(()=>{_.textContent=`좌클릭·드래그: 섬 조각(huge rise) · Shift+클릭: 내리기 · 우클릭·드래그: 카메라 · 휠: 줌`}).catch(e=>{_.textContent=`WebGPU error: ${e instanceof Error?e.message:String(e)}`,console.error(e)});