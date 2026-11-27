(() => {
  const canvas = document.querySelector('.home-latent__canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const art = canvas.closest('.home-latent__art');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const surfaces = [];
  const sectors = 18;
  let width = 0;
  let height = 0;
  let angle = -.34;
  let frame = 0;
  let lastFrame = 0;
  let visible = false;

  // A faceted classical bust, drawn as a real 3D wireframe rather than a flat image.
  const addSurface = (name, rings, ripple = 0) => {
    const vertices = [];
    const edges = [];

    rings.forEach((ring, row) => {
      for (let column = 0; column < sectors; column += 1) {
        const theta = column * Math.PI * 2 / sectors;
        const wave = 1 + ripple * Math.sin(theta * 9 + row * .9);
        const front = Math.cos(theta);
        const nose = name === 'face' && front > .94 && ring.y > -.08 && ring.y < .43 ? .11 : 0;
        vertices.push({
          x: Math.sin(theta) * ring.x * wave,
          y: ring.y,
          z: front * ring.z * wave + (ring.offset || 0) + nose,
        });

        const here = row * sectors + column;
        const next = row * sectors + (column + 1) % sectors;
        edges.push([here, next, 'ring']);
        if (row < rings.length - 1) {
          edges.push([here, here + sectors, 'spine']);
          if ((column + row) % 3 === 0) {
            edges.push([here, (row + 1) * sectors + (column + 1) % sectors, 'facet']);
          }
        }
      }
    });
    surfaces.push({ name, vertices, edges });
  };

  addSurface('shoulders', [
    { y: -1.02, x: .27, z: .27, offset: -.11 },
    { y: -1.17, x: .55, z: .39, offset: -.11 },
    { y: -1.39, x: .87, z: .46, offset: -.13 },
    { y: -1.59, x: 1.01, z: .49, offset: -.14 },
    { y: -1.72, x: 1.02, z: .48, offset: -.15 },
  ], .025);
  addSurface('face', [
    { y: -.56, x: .25, z: .27 },
    { y: -.43, x: .36, z: .36 },
    { y: -.25, x: .44, z: .42 },
    { y: -.06, x: .48, z: .45 },
    { y: .14, x: .47, z: .45 },
    { y: .33, x: .44, z: .42 },
    { y: .51, x: .39, z: .37 },
    { y: .68, x: .28, z: .29 },
    { y: .80, x: .10, z: .14 },
  ]);
  addSurface('hair', [
    { y: .43, x: .45, z: .39, offset: -.04 },
    { y: .58, x: .52, z: .46, offset: -.05 },
    { y: .74, x: .50, z: .43, offset: -.06 },
    { y: .89, x: .38, z: .34, offset: -.06 },
    { y: 1.02, x: .19, z: .20, offset: -.06 },
    { y: 1.07, x: .04, z: .04, offset: -.06 },
  ], .07);
  addSurface('beard', [
    { y: -.23, x: .42, z: .40, offset: .08 },
    { y: -.42, x: .46, z: .44, offset: .10 },
    { y: -.62, x: .40, z: .41, offset: .13 },
    { y: -.84, x: .32, z: .35, offset: .14 },
    { y: -1.05, x: .19, z: .23, offset: .14 },
    { y: -1.20, x: .035, z: .055, offset: .14 },
  ], .055);

  const faceDetails = [
    [[-.39, .30, .32], [-.30, .35, .40], [-.19, .33, .45], [-.12, .29, .46]],
    [[.12, .29, .46], [.19, .33, .45], [.30, .35, .40], [.39, .30, .32]],
    [[-.35, .22, .39], [-.27, .19, .45], [-.19, .20, .48], [-.13, .23, .47]],
    [[.13, .23, .47], [.19, .20, .48], [.27, .19, .45], [.35, .22, .39]],
    [[0, .28, .52], [0, .08, .60], [0, -.05, .66], [-.07, -.10, .56], [.07, -.10, .56]],
    [[-.21, -.17, .47], [-.10, -.14, .52], [0, -.17, .54], [.10, -.14, .52], [.21, -.17, .47]],
    [[-.13, -.27, .47], [0, -.30, .51], [.13, -.27, .47]],
    [[-.36, .54, .34], [-.25, .49, .42], [-.12, .54, .46], [0, .49, .47], [.13, .54, .46], [.27, .49, .41], [.38, .55, .32]],
    [[-.38, -.29, .42], [-.29, -.53, .44], [-.18, -.77, .42], [-.09, -.99, .33]],
    [[.38, -.29, .42], [.29, -.53, .44], [.18, -.77, .42], [.09, -.99, .33]],
    [[-.81, -1.34, .32], [-.53, -1.45, .40], [-.27, -1.69, .35]],
    [[.81, -1.34, .32], [.53, -1.45, .40], [.27, -1.69, .35]],
  ];

  const project = (point, yaw, unit) => {
    const cosine = Math.cos(yaw);
    const sine = Math.sin(yaw);
    const x = point.x * cosine + point.z * sine;
    const rotatedZ = point.z * cosine - point.x * sine;
    const pitch = -.07;
    const y = point.y * Math.cos(pitch) - rotatedZ * Math.sin(pitch);
    const z = point.y * Math.sin(pitch) + rotatedZ * Math.cos(pitch);
    const perspective = 4.8 / (4.8 - z);
    return {
      x: width / 2 + x * unit * perspective,
      y: height / 2 - (y + .33) * unit * perspective,
      z,
    };
  };

  const draw = () => {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    const unit = Math.min(width, height) * .29;
    const dark = document.documentElement.dataset.theme === 'dark';
    const ink = dark ? '157, 240, 199' : '19, 92, 80';
    const soft = dark ? '115, 190, 151' : '85, 151, 121';
    const segments = [];

    surfaces.forEach((surface) => {
      const points = surface.vertices.map((point) => project(point, angle, unit));
      surface.edges.forEach(([from, to, kind]) => {
        const a = points[from];
        const b = points[to];
        segments.push({ a, b, kind, depth: (a.z + b.z) / 2 });
      });
    });
    segments.sort((a, b) => a.depth - b.depth);
    segments.forEach(({ a, b, kind, depth }) => {
      const amount = Math.max(0, Math.min(1, (depth + .8) / 1.65));
      const opacity = (.18 + .74 * Math.pow(amount, 1.4)) * (kind === 'facet' ? .4 : 1);
      context.strokeStyle = `rgba(${amount > .42 ? ink : soft}, ${opacity})`;
      context.lineWidth = kind === 'facet' ? .7 : 1.15;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    });

    const facing = Math.max(0, Math.min(1, (Math.cos(angle) + .08) * 1.5));
    if (facing > .04) {
      context.strokeStyle = `rgba(${ink}, ${.82 * facing})`;
      context.lineWidth = 1.35;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      faceDetails.forEach((line) => {
        context.beginPath();
        line.forEach(([x, y, z], index) => {
          const point = project({ x, y, z }, angle, unit);
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.stroke();
      });
    }
    canvas.dataset.wireframeReady = 'true';
    canvas.dataset.angle = angle.toFixed(2);
  };

  const resize = () => {
    const bounds = art.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw();
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
  };
  const tick = (time) => {
    if (lastFrame && time - lastFrame < 32) {
      frame = requestAnimationFrame(tick);
      return;
    }
    if (lastFrame) angle += Math.min(time - lastFrame, 60) * .00023;
    lastFrame = time;
    draw();
    frame = requestAnimationFrame(tick);
  };
  const syncMotion = () => {
    const shouldRun = visible && !reducedMotion.matches && !document.hidden;
    if (shouldRun && !frame) frame = requestAnimationFrame(tick);
    if (!shouldRun) stop();
  };

  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(art);
  else window.addEventListener('resize', resize, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    }, { threshold: .05 }).observe(art);
  } else {
    visible = true;
    syncMotion();
  }
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
