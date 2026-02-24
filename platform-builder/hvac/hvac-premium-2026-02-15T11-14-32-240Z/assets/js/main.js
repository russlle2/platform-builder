/* HVAC Premium Template JS */
(function(){
  'use strict';
  // Mobile nav toggle
  const navToggle = document.getElementById('nav-toggle');
  const navList = document.querySelector('nav ul');
  if (navToggle && navList) {
    navToggle.addEventListener('click', function(){
      const isOpen = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Financing calculator
  function calcPayment(){
    const amountEl = document.getElementById('finance-amount');
    const aprEl = document.getElementById('finance-apr');
    const termEl = document.getElementById('finance-term');
    const resultEl = document.getElementById('finance-result');
    if(!amountEl || !aprEl || !termEl || !resultEl) return;
    const P = parseFloat(amountEl.value || '0');
    const annual = parseFloat(aprEl.value || '0');
    const n = parseInt(termEl.value || '12', 10);
    const r = annual / 100 / 12; // monthly rate
    let m = 0;
    if (r === 0) {
      m = P / n;
    } else {
      m = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    const total = m * n;
    resultEl.innerHTML = isFinite(m) ? (
      '<div class="alert ok" role="status"><strong>Estimated monthly:</strong> $' + m.toFixed(2) +
      ' <span class="small">for ' + n + ' months at ' + annual.toFixed(2) + '% APR</span><br><span class="small">Est. total: $' + total.toFixed(2) + '</span></div>'
    ) : '<div class="alert err">Enter a valid amount, APR, and term.</div>';
  }
  ['finance-amount','finance-apr','finance-term'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcPayment);
  });
  calcPayment();

  // Booking form: populate time slots for selected date
  const dateInput = document.getElementById('appt-date');
  const timeSelect = document.getElementById('appt-time');
  function buildSlotsFor(date){
    if (!timeSelect) return;
    timeSelect.innerHTML = '';
    const startHour = 8; // 8 AM
    const endHour = 17; // 5 PM
    const stepMin = 30;
    const now = new Date();
    const isToday = date && new Date(date).toDateString() === now.toDateString();
    for (let h = startHour; h <= endHour; h++) {
      for (let m = 0; m < 60; m += stepMin) {
        const slot = new Date(date || now);
        slot.setHours(h, m, 0, 0);
        if (isToday && slot < now) continue; // skip past times today
        const label = slot.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
        const opt = document.createElement('option');
        opt.value = label;
        opt.textContent = label;
        timeSelect.appendChild(opt);
      }
    }
    if (!timeSelect.options.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No slots available';
      timeSelect.appendChild(opt);
    }
  }
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.addEventListener('change', e=> buildSlotsFor(e.target.value));
    buildSlotsFor(`${yyyy}-${mm}-${dd}`);
  }

  // Simple client-side form validation helper
  document.querySelectorAll('form[data-validate]')?.forEach(form => {
    form.addEventListener('submit', function(e){
      let ok = true;
      form.querySelectorAll('[required]')?.forEach(field => {
        if (!field.value || (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value))) {
          ok = false;
          field.setAttribute('aria-invalid', 'true');
          field.classList.add('err');
        } else {
          field.removeAttribute('aria-invalid');
          field.classList.remove('err');
        }
      });
      if (!ok) {
        e.preventDefault();
        alert('Please complete the required fields.');
      }
    });
  });
})();
