import {
  BackSide,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Points,
  PointsMaterial,
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
      materials.forEach(({ fill, stroke, points, silhouette }) => {
        fill.color.set(dark ? '#17372d' : '#e0eee5');
        stroke.color.set(dark ? '#a1ffcb' : '#176a58');
        points.color.set(dark ? '#d2ffe3' : '#0c5d4b');
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
        const stroke = new LineBasicMaterial({ transparent: true, opacity: .67, depthWrite: false });
        const silhouetteMaterial = new MeshBasicMaterial({ side: BackSide });
        child.material = fill;

        // Merge nearby scan vertices into a legible point-line mesh while preserving its topology.
        const vertices = child.geometry.getAttribute('position');
        const vertexClusters = new Uint32Array(vertices.count);
        const clusters = [];
        const clusterLookup = new Map();
        const cellSize = 5;
        for (let index = 0; index < vertices.count; index += 1) {
          const x = vertices.getX(index);
          const y = vertices.getY(index);
          const z = vertices.getZ(index);
          const key = [x, y, z].map((value) => Math.round(value / cellSize)).join(',');
          let clusterIndex = clusterLookup.get(key);
          if (clusterIndex === undefined) {
            clusterIndex = clusters.length;
            clusterLookup.set(key, clusterIndex);
            clusters.push({ x: 0, y: 0, z: 0, count: 0 });
          }
          vertexClusters[index] = clusterIndex;
          const cluster = clusters[clusterIndex];
          cluster.x += x;
          cluster.y += y;
          cluster.z += z;
          cluster.count += 1;
        }
        clusters.forEach((cluster) => {
          cluster.x /= cluster.count;
          cluster.y /= cluster.count;
          cluster.z /= cluster.count;
        });

        const indices = child.geometry.getIndex();
        const triangleCount = (indices ? indices.count : vertices.count) / 3;
        const edgeKeys = new Set();
        const edges = [];
        const addEdge = (a, b) => {
          if (a === b) return;
          const key = a < b ? `${a}:${b}` : `${b}:${a}`;
          if (edgeKeys.has(key)) return;
          edgeKeys.add(key);
          edges.push(a, b);
        };
        for (let triangle = 0; triangle < triangleCount; triangle += 1) {
          const base = triangle * 3;
          const a = vertexClusters[indices ? indices.getX(base) : base];
          const b = vertexClusters[indices ? indices.getX(base + 1) : base + 1];
          const c = vertexClusters[indices ? indices.getX(base + 2) : base + 2];
          if (Math.max(clusters[a].y, clusters[b].y, clusters[c].y) < 23) continue;
          addEdge(a, b);
          addEdge(b, c);
          addEdge(c, a);
        }
        const linePositions = [];
        edges.forEach((clusterIndex) => {
          const point = clusters[clusterIndex];
          linePositions.push(point.x, point.y, point.z);
        });
        const meshLines = new BufferGeometry();
        meshLines.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
        child.add(new LineSegments(meshLines, stroke));

        const pointPositions = [];
        clusters.forEach((point) => {
          if (point.y >= 23) pointPositions.push(point.x, point.y, point.z);
        });
        const pointGeometry = new BufferGeometry();
        pointGeometry.setAttribute('position', new Float32BufferAttribute(pointPositions, 3));
        const points = new PointsMaterial({ size: 2.3, sizeAttenuation: false, transparent: true, opacity: .9, depthWrite: false });
        child.add(new Points(pointGeometry, points));

        child.geometry.computeBoundingBox();
        const localCenter = child.geometry.boundingBox.getCenter(new Vector3());
        const scale = 1.015;
        const silhouette = new Mesh(child.geometry, silhouetteMaterial);
        silhouette.position.copy(localCenter).multiplyScalar(1 - scale);
        silhouette.scale.setScalar(scale);
        child.add(silhouette);
        materials.push({ fill, stroke, points, silhouette: silhouetteMaterial });
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
