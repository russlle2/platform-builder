(function(){
  'use strict';
  const $ = (s, c=document)=>c.querySelector(s);
  const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));

  // Mobile nav toggle
  const toggle = $('.menu-toggle');
  const panel = $('.mobile-panel');
  if(toggle){
    toggle.addEventListener('click',()=>{
      const open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      if(open){ panel.querySelector('a')?.focus(); }
    });
  }

  // Close mobile panel on link click
  $$('.mobile-panel a').forEach(a=>a.addEventListener('click',()=>{
    panel.classList.remove('open');
    toggle?.setAttribute('aria-expanded','false');
  }));

  // Accessible accordions (for any <details>)
  $$('details').forEach(d => {
    const s = d.querySelector('summary');
    if(s){ s.setAttribute('role','button'); s.setAttribute('aria-expanded', d.open ? 'true' : 'false'); }
    d.addEventListener('toggle',()=>{
      s?.setAttribute('aria-expanded', d.open ? 'true' : 'false');
    });
  });

  // Simple form handlers (demo only)
  function serialize(form){
    const data = new FormData(form);
    return Object.fromEntries(data.entries());
  }

  function announce(msg,type='status'){
    const region = $('#aria-live') || (function(){
      const live = document.createElement('div');
      live.id = 'aria-live';
      live.className = 'sr-only';
      live.setAttribute('aria-live','polite');
      document.body.appendChild(live);
      return live;
    })();
    region.textContent = msg;
    if(type==='error') console.error(msg); else console.info(msg);
  }

  function mockSubmit(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const orig = btn?.textContent;
      btn && (btn.disabled = true, btn.textContent = 'Submitting…');
      const payload = serialize(form);
      try{ localStorage.setItem('form:'+ (form.id||form.name||'generic'), JSON.stringify(payload)); }catch(e){}
      setTimeout(()=>{
        btn && (btn.disabled = false, btn.textContent = orig||'Submit');
        const msg = 'Thanks! Your information has been saved locally. Please connect this form to your backend to receive submissions.';
        announce(msg);
        const conf = form.querySelector('.form-confirm');
        if(conf){ conf.hidden = false; conf.focus?.(); }
      }, 600);
    });
  }

  $$('.form[data-mock-submit]')?.forEach(mockSubmit);

  // Client-side date minimum (today)
  $$('input[type="date"]').forEach(inp=>{
    const t = new Date();
    const pad = n=>String(n).padStart(2,'0');
    const val = `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    if(!inp.min) inp.min = val;
  });

  // Auto-fill phone tel: links with accessible labels
  $$('a[href^="tel:"]').forEach(a=>{
    if(!a.getAttribute('aria-label')){
      a.setAttribute('aria-label','Call our office');
    }
  });
})();
