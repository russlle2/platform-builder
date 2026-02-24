(function(){
  document.getElementById('year').textContent=new Date().getFullYear();
  var vibes = {
    calm: {name:'Calm', oils:['Lavender','Roman Chamomile','Bergamot']},
    focus: {name:'Focus', oils:['Rosemary','Sweet Orange','Peppermint']},
    uplift: {name:'Uplift', oils:['Grapefruit','Mandarin','Bergamot']},
    ground: {name:'Ground', oils:['Cedarwood','Patchouli','Frankincense']}
  };

  function dropsFor(volumeMl, percent){
    var dropsPerMl=20; // approximate
    return Math.max(1, Math.round(volumeMl*(percent/100)*dropsPerMl));
  }

  function renderBlend(vibeKey, volume, percent){
    var v=vibes[vibeKey]||vibes.calm;
    var dropsTotal=dropsFor(volume,percent);
    var perOil=Math.max(1, Math.round(dropsTotal/v.oils.length));
    var html='';
    html+='<div class="card">';
    html+='<h4>'+v.name+' blend</h4>';
    html+='<p><strong>Volume:</strong> '+volume+' ml — <strong>Dilution:</strong> '+percent+'% — <strong>Total drops:</strong> '+dropsTotal+'</p>';
    html+='<ul>';
    v.oils.forEach(function(o,i){ html+='<li>'+o+': '+perOil+' drops</li>';});
    html+='</ul>';
    html+='<p class="safety">Safety note: This is educational and not medical advice. Do a patch test on a small skin area before topical use, avoid sensitive sites, and keep blends away from pets. If pregnant, nursing, or under medical care, consult a professional.</p>';
    html+='<button id="print-blend" class="btn">Print card</button>';
    html+='</div>';
    return html;
  }

  document.getElementById('build-blend').addEventListener('click',function(){
    var vibe=document.getElementById('vibe-select').value;
    var volume=parseFloat(document.getElementById('volume-ml').value)||10;
    var intensity=parseFloat(document.getElementById('intensity').value)||1;
    var content=renderBlend(vibe,volume,intensity);
    var out=document.getElementById('blend-result');
    out.innerHTML=content;
    var btn=document.getElementById('print-blend');
    if(btn) btn.addEventListener('click',function(){ window.print();});
  });

  // Modal system
  var overlay=document.getElementById('modal-overlay');
  var modalContent=document.getElementById('modal-content');
  function openModal(html){ modalContent.innerHTML=html; overlay.hidden=false; document.getElementById('modal-close').focus(); }
  function closeModal(){ overlay.hidden=true; modalContent.innerHTML=''; }
  document.getElementById('modal-close').addEventListener('click',closeModal);
  overlay.addEventListener('click',function(e){ if(e.target===overlay) closeModal();});

  // Guided exercises
  document.getElementById('try-exercise').addEventListener('click',function(){
    openModal(breathingHtml());
    startBreathing(document.getElementById('breath-circle'));
    var journelink=document.getElementById('open-journal');
    if(journelink) journelink.addEventListener('click',function(){ openJournaling(); });
  });

  function breathingHtml(){
    return '<div class="exercise"><h3>Breathing moment</h3><p>Follow the circle: inhale as it grows, exhale as it shrinks. Four calm cycles. You can switch to a short writing prompt below.</p><div id="breath-circle" class="breath-circle"></div><div class="controls"><button id="stop-breath" class="btn">Stop</button><button id="open-journal" class="btn">Try a quick journal prompt</button></div></div>';
  }
  var breathTimer=0;
  function startBreathing(el){
    var cycles=4;
    var phase=0;
    if(!el) return;
    el.style.transform='scale(0.6)';
    clearInterval(breathTimer);
    breathTimer=setInterval(function(){
      phase++;
      var t=(phase%60)/60;
      var scale=0.6+0.55*Math.sin(t*Math.PI*2);
      el.style.transform='scale('+scale+')';
      if(phase>cycles*60){ clearInterval(breathTimer); }
    },100);
    document.getElementById('stop-breath').addEventListener('click',function(){ clearInterval(breathTimer); closeModal();});
  }

  // Journaling exercise accessible from modal
  function journalingHtml(){
    return '<div class="exercise"><h3>Short journaling</h3><p>Set an intention, write for five minutes, then reflect.</p><textarea id="journal-text" rows="6" placeholder="I intend to..."></textarea><div class="controls"><button id="start-journal" class="btn">Start 5 min</button><button id="close-journal" class="btn">Close</button><div id="journal-timer" class="timer"></div></div></div>';
  }
  window.openJournaling=function(){ openModal(journalingHtml()); document.getElementById('start-journal').addEventListener('click',startJournal); document.getElementById('close-journal').addEventListener('click',function(){ closeModal();}); }
  function startJournal(){
    var t=5*60; var timerEl=document.getElementById('journal-timer');
    var iv=setInterval(function(){
      var m=Math.floor(t/60), s=t%60;
      timerEl.textContent=('00'+m).slice(-2)+':'+('00'+s).slice(-2);
      if(t--<=0){ clearInterval(iv); timerEl.textContent='Done'; }
    },1000);
  }

})();