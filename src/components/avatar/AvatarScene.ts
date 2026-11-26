import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import modelUrl from '../../assets/avatar/giovanna.glb?url';
import type { AvatarProps } from './CycleAvatar';
import { phaseVisuals } from './avatarConfig';

export interface AvatarScene {
  update: (props: AvatarProps) => void;
}

function releaseObjects(root: Object3D) {
  const materials = new Set<Material>();
  const geometries = new Set<BufferGeometry>();
  root.traverse((part) => {
    if (part instanceof Mesh || part instanceof Points) {
      geometries.add(part.geometry);
      for (const material of [part.material].flat()) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  // GLTFLoader can reuse both textures and their ImageBitmaps across materials.
  const textures = new Set<Texture>();
  const bitmaps = new Set<ImageBitmap>();
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof Texture) textures.add(value);
    }
    material.dispose();
  }
  for (const texture of textures) {
    const image = texture.source.data;
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) bitmaps.add(image);
    texture.dispose();
  }
  for (const bitmap of bitmaps) bitmap.close();
}

function createSparkles() {
  const geometry = new BufferGeometry();
  // Distribute points in a spiral around the silhouette using deterministic positions.
  const positions = new Float32Array(24 * 3);
  for (let i = 0; i < positions.length / 3; i++) {
    const angle = i * 2.39996;
    positions.set(
      [
        Math.cos(angle) * (0.53 + 0.1 * Math.sin(i)),
        0.14 + (i / 24) * 1.82,
        Math.sin(angle) * 0.33,
      ],
      i * 3,
    );
  }
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const material = new ShaderMaterial({
    uniforms: {
      tint: { value: new Color() },
      time: { value: 0 },
      opacity: { value: 0 },
      petals: { value: 0 },
      glint: { value: 0 },
      pixelRatio: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float time, pixelRatio;
      varying float flicker;
      void main() {
        vec3 p = position;
        float seed = p.y * 13.0;
        p.y += 0.044 * sin(time * 0.6 + seed);
        p.x += 0.025 * sin(time * 0.7 + seed);
        flicker = 0.5 + 0.5 * sin(time * 1.4 + seed);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (3.5 + 5.4 * flicker) * pixelRatio;
      }`,
    fragmentShader: `
      uniform vec3 tint;
      uniform float opacity, petals, glint;
      varying float flicker;
      void main() {
        vec2 uv = (gl_PointCoord - 0.5) * 2.0;
        float radius = length(uv);
        float halo = 1.0 - smoothstep(0.0, 1.0, radius);
        float flowerEdge = 0.49 + 0.17 * cos(5.0 * atan(uv.y, uv.x));
        float flower = 1.0 - smoothstep(flowerEdge - 0.10, flowerEdge + 0.06, radius);
        float starDistance = sqrt(abs(uv.x)) + sqrt(abs(uv.y));
        float star = 1.0 - smoothstep(0.83, 1.03, starDistance);
        float shape = mix(mix(halo, flower, petals), star, glint);
        vec3 color = mix(tint, vec3(1.0), 0.2 * (1.0 - smoothstep(0.0, 0.28, radius)));
        gl_FragColor = vec4(color, (0.18 * halo + 0.82 * shape) * opacity * (0.45 + 0.55 * flicker));
        #include <colorspace_fragment>
      }`,
  });
  return new Points(geometry, material);
}

export function createAvatarScene(
  canvas: HTMLCanvasElement,
  initial: AvatarProps,
  signal: AbortSignal,
  setState: (state: 'ready' | 'unavailable') => void,
): AvatarScene {
  const options: WebGLContextAttributes = {
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  };
  const context = canvas.getContext('webgl2', options);
  if (!context) throw new Error('WebGL 2 indisponível');
  const renderer = new WebGLRenderer({ canvas, context, ...options, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 12);
  camera.position.set(0.36, 1.23, 5);
  camera.lookAt(0, 1.04, 0);

  const figure = new Group();
  const ambient = new HemisphereLight(0xfff5ed, 0xc6b4cf, 1.6);
  const key = new DirectionalLight(0xfff3e8, 2.1);
  key.position.set(-2, 3.2, 4);
  const rim = new DirectionalLight(0xffffff, 1.8);
  rim.position.set(1.6, 2, -1);
  const particles = createSparkles();
  particles.material.uniforms.pixelRatio.value = renderer.getPixelRatio();

  // Soft contact shadow without a shadow-map pass on each frame.
  const shadow = new Mesh(
    new PlaneGeometry(0.95, 0.11),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader:
        'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:
        'varying vec2 vUv; void main(){float d=length(vUv-0.5)*2.0; gl_FragColor=vec4(0.17,0.09,0.23,0.22*(1.0-smoothstep(0.02,1.0,d)));}',
    }),
  );
  shadow.position.set(0, -0.006, -0.02);
  shadow.quaternion.copy(camera.quaternion);
  scene.add(figure, ambient, key, rim, particles, shadow);

  let target = phaseVisuals(initial.currentPhase);
  const motion = { ...target };
  const tint = new Color(target.tint);
  rim.color.copy(tint);
  let request = 0;
  let lastFrame = 0;
  let clock = 0;
  let ready = false;
  let lost = false;
  let onScreen = true;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let torso: Object3D | undefined, head: Object3D | undefined;
  let leftEye: Object3D | undefined, rightEye: Object3D | undefined;
  const smiles: { weights: number[]; index: number }[] = [];
  let leftArm: Object3D | undefined, rightArm: Object3D | undefined;
  let leftBrow: Object3D | undefined, rightBrow: Object3D | undefined;
  let leftForearm: Object3D | undefined, rightForearm: Object3D | undefined;
  let leftBrowY = 0,
    rightBrowY = 0;

  function schedule() {
    if (!request && ready && !lost && onScreen && !document.hidden && !signal.aborted)
      request = requestAnimationFrame(draw);
  }

  function draw(now: number) {
    request = 0;
    const reduced = reducedMotion.matches;
    const elapsed = lastFrame ? (now - lastFrame) / 1000 : 1 / 30;
    if (!reduced && elapsed < 1 / 30 - 0.001) {
      schedule();
      return;
    }
    lastFrame = now;
    const dt = Math.min(elapsed, 0.09);
    const blend = reduced ? 1 : 1 - Math.exp(-dt * 2.6);
    for (const property of ['speed', 'sway', 'smile', 'sparkle', 'petals', 'glint'] as const)
      motion[property] += (target[property] - motion[property]) * blend;
    if (!reduced) clock += dt * motion.speed;
    const breath = reduced ? 0 : Math.sin(clock * 1.7);
    const sway = reduced ? 0 : Math.sin(clock * 0.94) * motion.sway;
    figure.position.y = 0.047 + breath * 0.012;
    figure.rotation.y = -0.075 + sway * 0.055;
    if (torso) {
      torso.scale.y = 1 + breath * 0.009;
      torso.rotation.z = sway * 0.012;
    }
    if (head) {
      head.rotation.y = sway * 0.08;
      head.rotation.z = 0.035 + sway * 0.021;
      head.rotation.x = 0.025 - motion.smile * 0.045;
    }
    for (const { weights, index } of smiles) weights[index] = motion.smile;
    const blinkTime = clock % 4.65;
    const blink = !reduced && blinkTime > 4.4 ? Math.sin(((blinkTime - 4.4) / 0.25) * Math.PI) : 0;
    const openness = (0.85 + 0.13 * motion.smile) * (1 - 0.94 * blink);
    if (leftEye) leftEye.scale.y = openness;
    if (rightEye) rightEye.scale.y = openness;
    if (leftArm) {
      leftArm.rotation.z = 0.04 + 0.16 * motion.smile + sway * 0.026;
      leftArm.rotation.x = -0.08 - 0.1 * motion.smile;
    }
    if (rightArm) {
      rightArm.rotation.z = -0.06 - 0.18 * motion.smile - sway * 0.03;
      rightArm.rotation.x = -0.14 - 0.35 * motion.smile;
    }
    if (leftForearm) leftForearm.rotation.x = -0.05 - 0.12 * motion.smile;
    if (rightForearm) rightForearm.rotation.x = -0.07 - 0.22 * motion.smile;
    if (leftBrow) leftBrow.position.y = leftBrowY + 0.004 * motion.smile;
    if (rightBrow) rightBrow.position.y = rightBrowY + 0.003 * motion.smile;
    rim.color.lerp(tint, blend);
    particles.material.uniforms.tint.value.copy(rim.color);
    particles.material.uniforms.time.value = clock;
    particles.material.uniforms.opacity.value = motion.sparkle;
    particles.material.uniforms.petals.value = motion.petals;
    particles.material.uniforms.glint.value = motion.glint;
    shadow.scale.x = 1 - breath * 0.035;
    renderer.render(scene, camera);
    if (!reduced) schedule();
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (w < 1 || h < 1) return;
    const aspect = w / h;
    const halfHeight = Math.max(1.17, 0.75 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = -camera.left;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    schedule();
  }

  function syncPlayback() {
    cancelAnimationFrame(request);
    request = 0;
    lastFrame = 0;
    schedule();
  }

  const size = new ResizeObserver(resize);
  size.observe(canvas);
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    syncPlayback();
  });
  visibility.observe(canvas);
  document.addEventListener('visibilitychange', syncPlayback, { signal });
  reducedMotion.addEventListener('change', syncPlayback, { signal });
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      lost = true;
      syncPlayback();
      setState('unavailable');
    },
    { signal },
  );
  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      lost = false;
      if (ready) setState('ready');
      resize();
      syncPlayback();
    },
    { signal },
  );
  signal.addEventListener(
    'abort',
    () => {
      cancelAnimationFrame(request);
      size.disconnect();
      visibility.disconnect();
      releaseObjects(scene);
      renderer.dispose();
      renderer.forceContextLoss();
    },
    { once: true },
  );

  async function load() {
    const response = await fetch(modelUrl, { signal });
    if (!response.ok) throw new Error('Modelo indisponível');
    const { scene: model } = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '');
    if (signal.aborted) {
      releaseObjects(model);
      return;
    }
    torso = model.getObjectByName('Torso');
    head = model.getObjectByName('Head');
    model.getObjectByName('Mouth')?.traverse((part) => {
      if (!(part instanceof Mesh)) return;
      const index = part.morphTargetDictionary?.Smile;
      if (index !== undefined && part.morphTargetInfluences) {
        smiles.push({ weights: part.morphTargetInfluences, index });
      }
    });
    leftEye = model.getObjectByName('EyeL');
    rightEye = model.getObjectByName('EyeR');
    leftArm = model.getObjectByName('ArmL');
    rightArm = model.getObjectByName('ArmR');
    leftForearm = model.getObjectByName('ForearmL');
    rightForearm = model.getObjectByName('ForearmR');
    leftBrow = model.getObjectByName('BrowsL');
    rightBrow = model.getObjectByName('BrowsR');
    leftBrowY = leftBrow?.position.y ?? 0;
    rightBrowY = rightBrow?.position.y ?? 0;
    figure.add(model);
    ready = true;
    if (!lost) setState('ready');
    resize();
  }

  void load().catch(() => {
    if (!signal.aborted) setState('unavailable');
  });
  return {
    update(props) {
      target = phaseVisuals(props.currentPhase);
      tint.set(target.tint);
      schedule();
    },
  };
}
