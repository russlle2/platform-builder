(function(){
  // Simple UI behaviors: menu, diagnostic, join form
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.querySelector('.main-nav');
  if(menuToggle){
    menuToggle.addEventListener('click', ()=>{
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      mainNav.style.display = expanded ? '' : 'flex';
    });
  }

  // Diagnostic quiz
  const diagRun = document.getElementById('diagRun');
  const diagResult = document.getElementById('diagResult');
  if(diagRun){
    diagRun.addEventListener('click', ()=>{
      const goal = document.querySelector('input[name="goal"]:checked').value;
      const sens = Array.from(document.querySelectorAll('input[name="sensitive"]:checked')).map(n=>n.value);
      let suggestion = '';
      if(goal === 'rest'){
        suggestion = 'Try a short diffuser session with a gentle lavender-woody blend (5–10 minutes). Keep windows slightly open and use low intensity. If sensitive to scents, prefer a single-note lavender at reduced duration.';
      } else if(goal === 'focus'){
        suggestion = 'A light citrus-woody atmosphere can feel clarifying. Diffuse for brief bursts (3–8 minutes) and observe household reactions. Consider a roll-on with a 2% dilution for personal use.';
      } else {
        suggestion = 'For a gentle uplift, choose a bright floral-citrus blend with careful dilution. Use a small spritz away from faces and always patch-test for skin use.';
      }
      if(sens.includes('pets')){
        suggestion += ' Note: For homes with pets, avoid direct exposure to animals and consult pet-safety resources before diffusing in shared spaces.';
      }
      if(sens.includes('fragrance')){
        suggestion = 'Since you note sensitivity, start with a single-note, low-duration diffusion (3–5 minutes) or a very light diluted roll-on. Always patch-test before topical application.';
      }
      diagResult.textContent = suggestion;
    });
  }

  // Join form handling (UI only)
  const joinForm = document.getElementById('joinForm');
  if(joinForm){
    joinForm.addEventListener('submit', function(e){
      e.preventDefault();
      const email = joinForm.querySelector('input[name="email"]').value;
      if(!email) return alert('Please add an email.');
      joinForm.querySelector('input[name="email"]').value = '';
      alert('Thanks — a welcome note will be sent to ' + email + '.');
    });
  }

  // Simple client-side enhancement: image fallback for SVG pattern if not supported
  const pattern = document.querySelector('.bg-pattern');
  if(pattern){
    pattern.addEventListener('error', ()=>{
      pattern.style.display = 'none';
    });
  }
})();