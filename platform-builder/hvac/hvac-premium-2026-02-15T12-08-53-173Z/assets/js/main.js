/* HVAC Premium Template JS */
(function(){
  const $ = (s, ctx=document)=>ctx.querySelector(s);
  const $$ = (s, ctx=document)=>Array.from(ctx.querySelectorAll(s));

  // Mobile nav toggle
  const menuBtn = $('.menu-btn');
  const navlinks = $('.navlinks');
  if(menuBtn && navlinks){
    menuBtn.addEventListener('click', ()=>{
      const isOpen = navlinks.classList.toggle('show');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Accordion logic
  $$('.acc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.acc-item');
      const expanded = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(expanded));
      const panel = item.querySelector('.acc-panel');
      if(panel){ panel.hidden = !expanded; }
    });
  });

  // Reviews carousel arrows
  $$('.reel').forEach(reel => {
    const prev = reel.parentElement.querySelector('[data-reel-prev]');
    const next = reel.parentElement.querySelector('[data-reel-next]');
    const step = 320;
    prev && prev.addEventListener('click', ()=> reel.scrollBy({left:-step, behavior:'smooth'}));
    next && next.addEventListener('click', ()=> reel.scrollBy({left: step, behavior:'smooth'}));
  });

  // Financing calculator
  function calcPayment(p, apr, months){
    const r = (apr/100)/12;
    if(r === 0) return p / months;
    return (p * r) / (1 - Math.pow(1 + r, -months));
  }
  const formCalc = $('#finance-calc');
  if(formCalc){
    const amount = $('#fc-amount');
    const apr = $('#fc-apr');
    const term = $('#fc-term');
    const out = $('#fc-output');
    const update = () => {
      const a = parseFloat(amount.value || '0');
      const r = parseFloat(apr.value || '0');
      const t = parseInt(term.value || '0', 10);
      if(a>0 && t>0){
        const m = calcPayment(a, r, t);
        out.textContent = `$${m.toFixed(2)} / mo`;
      } else {
        out.textContent = '—';
      }
    };
    [amount, apr, term].forEach(el => el && el.addEventListener('input', update));
    update();
  }

  // Basic client-side form validation
  $$('.needs-validate').forEach(form => {
    const status = form.querySelector('[data-form-status]');
    form.addEventListener('submit', (e)=>{
      const invalid = $$('input[required], select[required], textarea[required]', form).filter(el => !el.value.trim());
      if(invalid.length){
        e.preventDefault();
        invalid[0].focus();
        status && (status.textContent = 'Please fill all required fields.');
        status && status.classList.remove('success');
        status && status.classList.add('error');
      } else {
        status && (status.textContent = 'Form is valid. This is a static demo.');
        status && status.classList.remove('error');
        status && status.classList.add('success');
      }
    });
  });

  // Copy phone to clipboard shortcut
  $$('.copy-phone').forEach(btn => btn.addEventListener('click', async ()=>{
    const phone = btn.getAttribute('data-phone') || '';
    try{ await navigator.clipboard.writeText(phone); btn.textContent = 'Copied'; setTimeout(()=>btn.textContent='Copy', 1400);}catch(e){ /* ignore */ }
  }));
})();
