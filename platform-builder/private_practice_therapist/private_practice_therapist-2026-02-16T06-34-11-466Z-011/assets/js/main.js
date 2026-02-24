// Minimal interactive behavior for index
document.addEventListener('DOMContentLoaded',function(){
  // Year
  const year = document.getElementById('year'); if(year) year.textContent = new Date().getFullYear();

  // Menu toggle
  const menuToggle = document.getElementById('menuToggle');
  menuToggle&&menuToggle.addEventListener('click',function(){
    document.querySelector('.nav').classList.toggle('open');
  });

  // Diagnostic quick check
  const run = document.getElementById('runCheck');
  const form = document.getElementById('selfCheck');
  const result = document.getElementById('diagnosticResult');
  run&&run.addEventListener('click',function(){
    const data = new FormData(form);
    const overwhelmed = data.get('overwhelmed');
    const concern = data.get('concern');
    const goal = data.get('goal');
    let rec = '';
    if(overwhelmed==='daily' || overwhelmed==='often'){
      rec += 'You may benefit from more frequent support and stabilization tools. ';
    } else if(overwhelmed==='sometimes'){
      rec += 'Short-term support with skill-building could be helpful. ';
    } else {
      rec += 'You might start with a few focused sessions to clarify goals. ';
    }
    rec += 'Primary focus: '+ concern + '. Goal: '+ goal + '.';
    result.textContent = rec;
    result.classList.remove('hidden');
  });

  // Micro habits save/clear
  const saveBtn = document.getElementById('saveHabits');
  const clearBtn = document.getElementById('clearHabits');
  const microStatus = document.getElementById('microStatus');
  function loadHabits(){
    try{
      const saved = JSON.parse(localStorage.getItem('microHabits')||'{}');
      document.querySelectorAll('.micro-card input').forEach(input=>{
        const key = input.getAttribute('data-key');
        input.checked = !!saved[key];
      });
    }catch(e){/* ignore */}
  }
  function saveHabits(){
    const obj = {};
    document.querySelectorAll('.micro-card input').forEach(input=>{
      const key = input.getAttribute('data-key');
      obj[key] = !!input.checked;
    });
    localStorage.setItem('microHabits', JSON.stringify(obj));
    microStatus.textContent = 'Saved locally. Small steps add up.';
  }
  saveBtn&&saveBtn.addEventListener('click',saveHabits);
  clearBtn&&clearBtn.addEventListener('click',function(){
    document.querySelectorAll('.micro-card input').forEach(i=>i.checked=false);
    localStorage.removeItem('microHabits');
    microStatus.textContent = 'Cleared.';
  });
  loadHabits();

  // Pricing toggle
  const priceToggle = document.getElementById('priceToggle');
  if(priceToggle){
    priceToggle.addEventListener('click',function(e){
      if(e.target && e.target.dataset && e.target.dataset.mode){
        priceToggle.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        e.target.classList.add('active');
        const mode = e.target.dataset.mode;
        const grid = document.getElementById('pricingGrid');
        // Simple swap of content (client-side only)
        if(mode==='short-term'){
          grid.querySelectorAll('.price-card h4')[0].textContent = 'Intake + Plan';
          grid.querySelectorAll('.price-card .price')[0].textContent = '$340';
          grid.querySelectorAll('.price-card h4')[1].textContent = '4-Session Path';
          grid.querySelectorAll('.price-card .price')[1].textContent = 'Four sessions • $680';
          grid.querySelectorAll('.price-card h4')[2].textContent = '6-Week Focus';
          grid.querySelectorAll('.price-card .price')[2].textContent = 'Six sessions • $980';
        } else {
          grid.querySelectorAll('.price-card h4')[0].textContent = 'Single Session';
          grid.querySelectorAll('.price-card .price')[0].textContent = '$180';
          grid.querySelectorAll('.price-card h4')[1].textContent = 'Reflective Package';
          grid.querySelectorAll('.price-card .price')[1].textContent = 'Four sessions • $680';
          grid.querySelectorAll('.price-card h4')[2].textContent = 'Careful Continuity';
          grid.querySelectorAll('.price-card .price')[2].textContent = 'Weekly plan • custom';
        }
      }
    });
  }
});