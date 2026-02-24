document.addEventListener('DOMContentLoaded',function(){
  // year
  const y=document.getElementById('year'); if(y) y.textContent=(new Date()).getFullYear();

  // nav toggle
  const t=document.querySelector('.nav-toggle'); const list=document.querySelector('.nav-list');
  if(t){t.addEventListener('click',function(){
    const expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!expanded));
    if(list) list.style.display = expanded ? 'none' : 'flex';
  });
  }

  // simple diagnostic
  const quiz=document.getElementById('quiz'); const result=document.getElementById('quiz-result');
  if(quiz){
    quiz.addEventListener('submit',function(e){
      e.preventDefault();
      const data=new FormData(quiz);
      const notes = data.getAll('notes');
      const experience = data.getAll('experience');
      // rudimentary mapping for UX only
      let profile=[];
      if(notes.includes('citrus')) profile.push('Bright Citrus');
      if(notes.includes('floral')) profile.push('Soft Floral');
      if(notes.includes('herbal')) profile.push('Herbal & Green');
      if(notes.includes('wood')) profile.push('Warm Woods');

      let focus=false,sleep=false,uplift=false,calm=false;
      focus = experience.includes('focus'); sleep = experience.includes('sleep'); uplift = experience.includes('uplift'); calm = experience.includes('calm');

      // decide gentle suggestion
      let suggestion='A gentle blend to explore: ' + '{{FAVORITE_BLEND}}' + '.';
      if(profile.length){ suggestion = 'Scent family hint: ' + profile.join(', ') + '. Recommended gentle starting blend: {{FAVORITE_BLEND}}.'; }
      if(sleep) suggestion += ' Use only low dilution (≤1%) for bedtime and patch test first.';
      if(focus) suggestion += ' Try short diffuser bursts (15–30 min) during focused work.';
      if(uplift) suggestion += ' Add citrus top-notes for a bright lift.';
      if(calm) suggestion += ' Include 1–2 drops of lavender in a 10ml roll-on for soothing effect.';

      // safety reminder appended
      suggestion += '\n\nSafety: This is educational guidance. Do a patch test, follow dilution notes, and consult a practitioner if pregnant, nursing, or medicated. Not a medical diagnosis.';

      result.textContent = suggestion;
      result.scrollIntoView({behavior:'smooth',block:'center'});
    });
    const clear=document.getElementById('clear'); if(clear){clear.addEventListener('click',function(){quiz.reset();result.textContent='';});}
  }

  // simple anchor fallback for primary CTA
  const cta=document.querySelectorAll('a[href="{{PRIMARY_CTA_URL}}"]');
  cta.forEach(function(a){a.addEventListener('click',function(e){ /* placeholder for analytics or modal */ });});
});