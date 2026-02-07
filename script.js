// UI micro-interactions: CTA pulse and button ripple
document.addEventListener("DOMContentLoaded", function(){
  const cta = document.getElementById('cta');
  if(cta){
    cta.addEventListener('click', ()=>{
      cta.classList.add('pulse');
      setTimeout(()=>cta.classList.remove('pulse'),900);
    });
  }

  // simple ripple effect for buttons with .btn-modern
  document.querySelectorAll('.btn-modern').forEach(btn => {
    btn.addEventListener('click', function(e){
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top = (e.clientY - rect.top) + 'px';
      this.appendChild(ripple);
      setTimeout(()=> ripple.remove(), 700);
    });
  });
  // Dynamic coloring for map selection
  const mapOption = document.getElementById('mapOption');
  const mapColorMap = { mq: '#ec4899', temp: '#fb923c', hum: '#06b6d4' };

  function updateMapOptionStyle(){
    if(!mapOption) return;
    const v = mapOption.value || 'mq';
    const c = mapColorMap[v] || '#6ee7b7';
    mapOption.style.setProperty('--select-accent', c);
    mapOption.style.borderLeftColor = c;
    // update control section font colors and button accents
    const controls = document.querySelector('.controls-section');
    if(controls){
      controls.style.setProperty('--controls-accent', c);
    }
    // also tint CTA slightly (text color)
    document.querySelectorAll('.controls-section .btn-modern').forEach(b=>{
      b.style.color = c;
    });
  }

  if(mapOption){
    mapOption.addEventListener('change', updateMapOptionStyle);
    updateMapOptionStyle();
  }

  // Legend toggle based on map selection
  const legend = document.getElementById('legend');
  function updateLegend(type){
    if(!legend) return;
    legend.querySelectorAll('.legend-group').forEach(g=>{
      if(g.dataset.type === type) g.classList.add('active'); else g.classList.remove('active');
    });
    legend.setAttribute('aria-hidden', 'false');
  }

  if(mapOption){
    // initialize legend state
    updateLegend(mapOption.value || 'mq');
    mapOption.addEventListener('change', function(){ updateLegend(this.value); });
  }

  // Smooth scroll for internal nav links (account for topbar height)
  document.querySelectorAll('.nav-link[href^="#"]').forEach(a=>{
    a.addEventListener('click', function(e){
      const target = this.getAttribute('href');
      if(!target || target === '#') return; // default
      e.preventDefault();
      const el = document.querySelector(target);
      if(!el) return;
      const topbar = document.querySelector('.topbar');
      const offset = (topbar ? topbar.getBoundingClientRect().height : 0) + 16;
      const rect = el.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - offset;
      window.scrollTo({top: targetY, behavior: 'smooth'});
    });
  });
});
