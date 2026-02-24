document.addEventListener('DOMContentLoaded',function(){
  // Mood-to-Method
  const moodButtons = document.querySelectorAll('.mood');
  const methodText = document.getElementById('methodText');
  const primaryCta = document.getElementById('primaryCta');

  moodButtons.forEach(btn => {
    btn.addEventListener('click', ()=>{
      moodButtons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const method = btn.dataset.method;
      const cta = btn.dataset.cta;
      methodText.textContent = method + " — a concise approach ready to try within the membership.";
      primaryCta.textContent = cta || primaryCta.textContent;
      // subtly pulse the CTA
      primaryCta.animate([{transform:'scale(1)'},{transform:'scale(1.03)'},{transform:'scale(1)'}],{duration:420,iterations:1});
    });
  });

  // 30-day Path Map generator
  const goalsForm = document.getElementById('goalsForm');
  const daysSvg = document.getElementById('daysSvg');
  const dayPlan = document.getElementById('dayPlan');

  function computePlan(selectedGoals){
    // Map goals to color & micro-practices
    const map = {
      sleep: {color:'#6bb7b0',practice:'Night mini-routine (10m): wind-down breathing + screen off'},
      calm: {color:'#8fa8ff',practice:'Midday pause: 5-minute anchor practice'},
      focus: {color:'#ffd76b',practice:'Two 25-minute focus windows daily'},
      energy: {color:'#ff9aa2',practice:'Small midday movement anchor + hydration check'}
    };
    // Build 30-day day objects
    const days = [];
    for(let i=1;i<=30;i++){
      const pick = selectedGoals.length ? selectedGoals[(i-1) % selectedGoals.length] : 'core';
      const color = map[pick] ? map[pick].color : '#e6e6e6';
      const practice = map[pick] ? map[pick].practice : 'Daily review + 5-minute setup';
      days.push({day:i,color,practice,focus:pick});
    }
    return days;
  }

  function renderDays(days){
    // Clear svg
    while(daysSvg.firstChild) daysSvg.removeChild(daysSvg.firstChild);
    const width = 300; const height = 40; const pad = 4; const blockW = (width - pad*2) / days.length;
    daysSvg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    days.forEach((d,i)=>{
      const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
      rect.setAttribute('x', pad + i*blockW + 1);
      rect.setAttribute('y', 6);
      rect.setAttribute('width', Math.max(2, blockW - 2));
      rect.setAttribute('height', 28);
      rect.setAttribute('rx', 4);
      rect.setAttribute('fill', d.color);
      rect.setAttribute('data-day', d.day);
      rect.style.cursor = 'pointer';
      rect.addEventListener('click', ()=>{
        showDayPlan(d);
      });
      daysSvg.appendChild(rect);
    });
    // default show first week summary
    showWeekSummary(days);
  }

  function showDayPlan(d){
    dayPlan.innerHTML = '<strong>Day ' + d.day + ':</strong> ' + d.practice + ' <span class="muted">(' + d.focus + ')</span>';
  }

  function showWeekSummary(days){
    // build 7-day micro-plan
    const first7 = days.slice(0,7);
    let html = '<strong>First 7 days</strong><ol>';
    first7.forEach(d=> html += '<li>Day ' + d.day + ': ' + d.practice + '</li>');
    html += '</ol>';
    dayPlan.innerHTML = html;
  }

  function updateFromForm(){
    const selected = [];
    const inputs = goalsForm.querySelectorAll('input[type=checkbox]');
    inputs.forEach(i=>{ if(i.checked) selected.push(i.value); });
    const days = computePlan(selected);
    renderDays(days);
  }

  goalsForm.addEventListener('change', updateFromForm);

  // init: render neutral map
  renderDays(computePlan([]));

  // Accessibility: allow keyboard selection for moods
  document.querySelectorAll('.mood').forEach(btn=>btn.setAttribute('tabindex','0'));

});