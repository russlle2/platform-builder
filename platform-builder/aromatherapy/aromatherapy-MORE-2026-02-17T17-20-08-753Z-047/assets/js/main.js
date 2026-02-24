(function(){
  // Mood-to-Method: maps moods to suggested methods and CTA label
  const moodMap = {
    calm: {method:'Diffusion with a light citrus-mint lift — an ambient inhale to soften tension.',cta:'Begin a brief consult'},
    focus: {method:'A focused inhaler or a personal roll with rosemary and citrus may support concentration.',cta:'Order a focus inhaler'},
    fatigue: {method:'Topical pulse application with replenishing base notes (diluted) paired with gentle ritual.',cta:'Get a restore blend'},
    sleep: {method:'A bedside diffuser recipe with gentle bases may support restful transitions.',cta:'Receive a sleep guide'},
    lift: {method:'A quick inhalation blend of bergamot and floral middle notes may brighten the moment.',cta:'Try a bright sample'}
  };

  const moods = document.querySelectorAll('.mood');
  const methodText = document.getElementById('methodText');
  const methodCTA = document.getElementById('methodCTA');
  const primaryAction = document.getElementById('primaryAction');
  const finalCTA = document.getElementById('finalCTA');

  moods.forEach(btn=>{
    btn.addEventListener('click',()=>{
      const key = btn.getAttribute('data-mood');
      const info = moodMap[key];
      if(!info) return;
      // Morph page tone: update suggestion copy and CTA labels
      methodText.textContent = info.method;
      methodCTA.textContent = info.cta;
      primaryAction.textContent = info.cta;
      finalCTA.textContent = info.cta;
      // subtle visual change
      document.getElementById('moodMethod').style.borderColor = 'rgba(124,108,255,0.18)';
      // announce
      methodText.setAttribute('aria-live','polite');
    });
  });

  // Aroma wheel interaction: descriptions for notes
  const noteData = {
    bergamot:{title:'Bergamot (Top)','desc':'A bright citrus top note. Quick to lift mood; best in diffusion or inhalers.'},
    grapefruit:{title:'Grapefruit (Top)','desc':'Crisp and effervescent — a top note that may refresh short attention spans.'},
    mint:{title:'Mint (Top)','desc':'Cooled top note, useful in small amounts. Avoid near infants.'},
    lavender:{title:'Lavender (Middle)','desc':'A common middle note; often used diluted for calming rituals.'},
    rose:{title:'Rose (Middle)','desc':'A floral heart note that may soothe, often used sparingly.'},
    herb:{title:'Herbal Mix (Middle)','desc':'Green herbaceous notes that add clarity to a blend.'},
    sandalwood:{title:'Sandalwood (Base)','desc':'A warm base note that lingers; useful as a grounding partner in blends.'},
    vanilla:{title:'Vanilla (Base)','desc':'Sweet base that softens blends; usually used as an absolute or CO2.'},
    amber:{title:'Amber (Base)','desc':'Rich and resinous; anchors a blend and extends longevity.'}
  };

  const svg = document.getElementById('aromaWheel');
  const noteInfoTitle = document.getElementById('noteTitle');
  const noteInfoDesc = document.getElementById('noteDesc');

  if(svg){
    const segs = svg.querySelectorAll('.seg');
    segs.forEach(s=>{
      // make interactive
      s.setAttribute('tabindex','0');
      s.addEventListener('mouseenter',handleHover);
      s.addEventListener('focus',handleHover);
      s.addEventListener('mouseleave',()=>resetInfo());
      s.addEventListener('blur',()=>resetInfo());
      s.addEventListener('click',handleHover);
    });
  }

  function handleHover(e){
    const note = e.currentTarget.getAttribute('data-note');
    const type = e.currentTarget.getAttribute('data-type');
    const data = noteData[note] || {title:note,desc:'A fragrant note.'};
    noteInfoTitle.textContent = data.title + ' — ' + type;
    noteInfoDesc.textContent = data.desc + ' \nUsage note: always dilute for topical use and perform a patch test.';
  }
  function resetInfo(){
    noteInfoTitle.textContent = 'Hover a note';
    noteInfoDesc.textContent = 'Top notes are quick to perceive; bases linger. Hover any segment for a simple description.';
  }

  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Accessibility: keyboard shortcuts for mood (1-5)
  window.addEventListener('keydown',e=>{
    if(['1','2','3','4','5'].includes(e.key)){
      const idx = parseInt(e.key,10)-1;
      const btn = document.querySelectorAll('.mood')[idx];
      if(btn){btn.click();btn.focus();}
    }
  });
})();