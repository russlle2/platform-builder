(function(){
  const header = document.querySelector('.site-header');
  const year = document.getElementById('year');
  if(year) year.textContent = new Date().getFullYear();
  let last = 0; window.addEventListener('scroll',()=>{const y=window.scrollY; if(!header) return; header.dataset.scrolled = y>10; last=y;},{passive:true});

  // Mobile nav toggle
  const nav = document.querySelector('.primary-nav');
  const btn = document.querySelector('.nav-toggle');
  const menu = document.getElementById('site-menu');
  if(btn && nav && menu){
    btn.addEventListener('click',()=>{
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open? 'true':'false');
    });
    // Close on link click
    menu.addEventListener('click',e=>{ if(e.target.closest('a')){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); } });
  }

  // Finance calculator
  function calcMonthly(amount, apr, term, down){
    const P = Math.max(0, (amount - (down||0)));
    const r = (apr/100)/12; const n = term;
    if(r===0) return P/n; // zero APR
    return (P * r) / (1 - Math.pow(1+r, -n));
  }
  const finBtn = document.getElementById('fin-calc');
  if(finBtn){
    const out = document.getElementById('finance-result');
    finBtn.addEventListener('click',()=>{
      const amt = parseFloat(document.getElementById('fin-amount').value||'0');
      const apr = parseFloat(document.getElementById('fin-apr').value||'0');
      const term = parseInt(document.getElementById('fin-term').value||'0',10);
      const down = parseFloat(document.getElementById('fin-down').value||'0');
      if(!amt || !term || isNaN(apr)) { out.textContent = 'Please enter valid numbers.'; return; }
      const m = calcMonthly(amt, apr, term, down);
      const total = m*term + (down||0);
      out.innerHTML = `<p><strong>Estimated monthly:</strong> $${m.toFixed(2)}</p><p class="subtle">Total over ${term} months (incl. down): ~$${total.toFixed(2)}</p>`;
    });
  }

  // Booking form (demo)
  const booking = document.getElementById('booking-form');
  if(booking){
    booking.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = booking.querySelector('#bk-name').value.trim();
      const date = booking.querySelector('#bk-date').value;
      const time = booking.querySelector('#bk-time').value;
      const service = booking.querySelector('#bk-service').value;
      const feedback = document.getElementById('booking-feedback');
      if(!name || !date || !time || !service){ feedback.textContent = 'Please complete required fields.'; return; }
      feedback.innerHTML = `<p>Thanks, ${name}! We received your request for <strong>${service}</strong> on <strong>${date} ${time}</strong>. We\'ll confirm shortly at the contact info provided.</p><p>If urgent, call <a href="tel:{{PHONE}}">{{PHONE}}</a>.</p>`;
      booking.reset();
    });
  }

  // Contact form (demo)
  const contact = document.getElementById('contact-form');
  if(contact){
    contact.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = contact.querySelector('#ct-name').value.trim();
      const email = contact.querySelector('#ct-email').value.trim();
      const msg = contact.querySelector('#ct-msg').value.trim();
      const feedback = document.getElementById('contact-feedback');
      if(!name || !email || !msg){ feedback.textContent = 'Please fill in your name, email, and message.'; return; }
      feedback.innerHTML = `<p>Thanks, ${name}! Your message has been received. We\'ll reply to <strong>${email}</strong> during <strong>{{HOURS}}</strong>.</p><p>For urgent issues call <a href="tel:{{PHONE}}">{{PHONE}}</a>.</p>`;
      contact.reset();
    });
  }
})();
