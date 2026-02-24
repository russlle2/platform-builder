/* Template: dental-premium-2026-02-15T15-02-10-116Z */
(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Mobile nav
  const menuBtn = $('.menu-toggle');
  const nav = $('.nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  // Smooth scroll for anchor links
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (!id || id === '#' || !document.querySelector(id)) return;
      e.preventDefault();
      document.querySelector(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Simple form validation (required fields)
  $$('form[data-validate]')?.forEach(form => {
    form.addEventListener('submit', e => {
      let ok = true;
      $$('[required]', form).forEach(input => {
        if (!input.value.trim()) {
          ok = false; input.classList.add('invalid');
        } else input.classList.remove('invalid');
      });
      if (!ok) {
        e.preventDefault();
        const msg = $('.form-message', form) || document.createElement('div');
        msg.className = 'notice warn form-message';
        msg.role = 'alert';
        msg.textContent = 'Please complete all required fields.';
        if (!msg.parentNode) form.prepend(msg);
        msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Rating widget on reviews page
  const starInputs = $$('.js-rating input[type="radio"]');
  if (starInputs.length) {
    starInputs.forEach(input => {
      input.addEventListener('change', () => {
        const out = $('.js-rating-output');
        if (out) out.textContent = `You rated ${input.value} star${input.value === '1' ? '' : 's'}.`;
      });
    });
  }

  // Booking timeslots (book.html)
  function generateSlots(days = 14) {
    const slots = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay(); // 0 Sun
      if (dow === 0) continue; // closed Sundays
      const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const times = [];
      const start = 9; // 9 AM
      const end = 17; // 5 PM
      for (let h = start; h < end; h++) {
        ['00', '30'].forEach(m => {
          const t = new Date(d);
          t.setHours(h, m === '00' ? 0 : 30, 0, 0);
          times.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        });
      }
      slots.push({ date: dayLabel, times: times.slice(0, 10) }); // sample subset
    }
    return slots;
  }

  function renderSlots() {
    const host = $('#slots');
    if (!host) return;
    const data = generateSlots();
    host.innerHTML = '';
    data.forEach(group => {
      const section = document.createElement('section');
      section.className = 'card';
      section.innerHTML = `<h3 class="mb-1">${group.date}</h3><div class="flex" role="list"></div>`;
      const list = $('div', section);
      group.times.forEach(time => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline';
        btn.type = 'button';
        btn.textContent = time;
        btn.setAttribute('aria-label', `Select ${group.date} at ${time}`);
        btn.addEventListener('click', () => fillBooking(group.date, time));
        list.appendChild(btn);
      });
      host.appendChild(section);
    });
  }
  function fillBooking(date, time) {
    const f = $('#booking-form');
    if (!f) return;
    $('#preferred-date', f).value = date;
    $('#preferred-time', f).value = time;
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#full-name', f).focus();
  }
  renderSlots();

  // Copy phone number button if present
  const copyBtn = $('#copy-phone');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.phone || '');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
      } catch {}
    });
  }
})();
