import {
  BackSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
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

    const sculpture = new Group();
    scene.add(sculpture);
    const materials = [];
    const updatePalette = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      materials.forEach(({ fill, stroke, silhouette }) => {
        fill.color.set(dark ? '#142b25' : '#f1f8f3');
        stroke.color.set(dark ? '#a1ffcb' : '#135c50');
        silhouette.color.copy(stroke.color);
      });
      if (loaded) renderer.render(scene, camera);
    };
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
    new MutationObserver(updatePalette).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const draco = new DRACOLoader();
    draco.setDecoderPath(new URL('./third-party/three/', import.meta.url).href);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load(new URL('../models/plato-portrait.glb', import.meta.url).href, (gltf) => {
      const model = gltf.scene;
      const bounds = new Box3().setFromObject(model);
      const center = bounds.getCenter(new Vector3());
      model.position.sub(center);
      const meshes = [];
      model.traverse((child) => { if (child.isMesh) meshes.push(child); });
      meshes.forEach((child) => {
        const fill = new MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
        const stroke = new LineBasicMaterial({ transparent: true, opacity: .72, depthWrite: false });
        const silhouetteMaterial = new MeshBasicMaterial({ side: BackSide });
        child.material = fill;

        const edgeGeometry = new EdgesGeometry(child.geometry, 15);
        const positions = edgeGeometry.getAttribute('position');
        const lines = [];
        for (let index = 0; index < positions.count; index += 2) {
          // The scanned pedestal has noisy facets that distract from the face.
          if (Math.max(positions.getY(index), positions.getY(index + 1)) < 23) continue;
          for (let point = index; point < index + 2; point += 1) {
            lines.push(positions.getX(point), positions.getY(point), positions.getZ(point));
          }
        }
        edgeGeometry.setAttribute('position', new Float32BufferAttribute(lines, 3));
        child.add(new LineSegments(edgeGeometry, stroke));

        child.geometry.computeBoundingBox();
        const localCenter = child.geometry.boundingBox.getCenter(new Vector3());
        const scale = 1.015;
        const silhouette = new Mesh(child.geometry, silhouetteMaterial);
        silhouette.position.copy(localCenter).multiplyScalar(1 - scale);
        silhouette.scale.setScalar(scale);
        child.add(silhouette);
        materials.push({ fill, stroke, silhouette: silhouetteMaterial });
      });
      sculpture.add(model);
      sculpture.rotation.y = 0;
      loaded = true;
      updatePalette();
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
