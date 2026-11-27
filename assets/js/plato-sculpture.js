import {
  AmbientLight,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  Box3,
  Vector3,
} from 'three';
import { GLTFLoader } from './third-party/three/GLTFLoader.js';
import { DRACOLoader } from './third-party/three/DRACOLoader.js';

const canvas = document.querySelector('.home-latent__canvas');
const art = canvas?.closest('.home-latent__art');

if (canvas && art) {
  try {
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new OrthographicCamera(-77, 77, 77, -77, .1, 500);
    camera.position.set(0, 8, 240);
    camera.lookAt(0, 0, 0);

    scene.add(new AmbientLight(0xffffff, .65));
    const key = new DirectionalLight(0xffffff, 1.65);
    key.position.set(-70, 90, 120);
    scene.add(key);
    const fill = new DirectionalLight(0x8bdcbd, .55);
    fill.position.set(90, 10, -60);
    scene.add(fill);

    const sculpture = new Group();
    scene.add(sculpture);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let loaded = false;
    let frame = 0;
    let lastTime = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      const aspect = bounds.width / bounds.height;
      camera.left = -77 * aspect;
      camera.right = 77 * aspect;
      camera.top = 77;
      camera.bottom = -77;
      camera.updateProjectionMatrix();
      if (loaded) renderer.render(scene, camera);
    };

    const tick = (time) => {
      frame = 0;
      if (!loaded || !visible) return;
      if (!motion.matches && lastTime) sculpture.rotation.y += Math.min(time - lastTime, 40) * .00018;
      lastTime = time;
      renderer.render(scene, camera);
      if (!motion.matches) frame = requestAnimationFrame(tick);
    };

    const observe = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && loaded && !frame) {
        lastTime = 0;
        frame = requestAnimationFrame(tick);
      }
    }, { rootMargin: '80px' });
    observe.observe(art);
    new ResizeObserver(resize).observe(art);
    motion.addEventListener('change', () => {
      if (visible && loaded && !frame) frame = requestAnimationFrame(tick);
    });

    const draco = new DRACOLoader();
    draco.setDecoderPath(new URL('./third-party/three/', import.meta.url).href);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load(new URL('../models/plato-portrait.glb', import.meta.url).href, (gltf) => {
      const model = gltf.scene;
      const bounds = new Box3().setFromObject(model);
      const center = bounds.getCenter(new Vector3());
      model.position.sub(center);
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.material = new MeshStandardMaterial({ color: new Color('#b1c9b8'), roughness: .98, metalness: 0 });
        const contours = new LineSegments(
          new EdgesGeometry(child.geometry, 48),
          new LineBasicMaterial({ color: '#206b5d', transparent: true, opacity: .18, depthWrite: false }),
        );
        child.add(contours);
      });
      sculpture.add(model);
      sculpture.rotation.y = 0;
      loaded = true;
      resize();
      art.querySelector('.home-latent__poster').style.opacity = '0';
      draco.dispose();
      if (visible && !frame) frame = requestAnimationFrame(tick);
    }, undefined, () => {
      // Keep the credited still image visible if WebGL or the scan fails to load.
      draco.dispose();
    });
  } catch (_) {
    // The still image remains available when WebGL is unsupported.
  }
}
