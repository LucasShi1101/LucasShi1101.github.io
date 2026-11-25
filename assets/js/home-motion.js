(() => {
  const page = document.querySelector('.home-page');
  if (!page || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const revealTargets = page.querySelectorAll(
    '.home-intro > *, .home-research > .home-section__heading, .home-research__card, ' +
    '.home-vision > *, .home-section__heading, .home-news .news, ' +
    '.home-papers .publications, .home-journal__card, .home-closing > *'
  );

  if ('IntersectionObserver' in window) {
    revealTargets.forEach((item) => item.classList.add('home-reveal'));
    document.documentElement.classList.add('home-motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 160px 0px' });
    revealTargets.forEach((item) => observer.observe(item));
  }

  if (!window.matchMedia('(pointer: fine)').matches) return;
  const hero = page.querySelector('.home-hero__visual');
  if (!hero) return;

  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  const applyPointer = () => {
    hero.style.setProperty('--hero-move-x', `${pointerX * 12}px`);
    hero.style.setProperty('--hero-move-y', `${pointerY * 12}px`);
    hero.style.setProperty('--hero-tilt-x', `${pointerY * -2.5}deg`);
    hero.style.setProperty('--hero-tilt-y', `${pointerX * 2.5}deg`);
    hero.style.setProperty('--hero-note-x', `${pointerX * -6}px`);
    hero.style.setProperty('--hero-note-y', `${pointerY * -6}px`);
    frame = 0;
  };

  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    pointerY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    if (!frame) frame = requestAnimationFrame(applyPointer);
  });
  hero.addEventListener('pointerleave', () => {
    pointerX = 0;
    pointerY = 0;
    if (!frame) frame = requestAnimationFrame(applyPointer);
  });
})();
