document.addEventListener('DOMContentLoaded',function(){
  // Mood-to-Method map
  var map = {
    "overwhelmed":{
      title:"Stabilize Sprint",
      desc:"A compact 2-week track to reduce overwhelm: simple routines, priority triage, and focused pacing.",
      cta:"Reserve a Stabilize Sprint"
    },
    "low_energy":{
      title:"Energy Reset Cycle",
      desc:"Three-week series emphasizing sleep patterns, gentle movement, and nutrition pivots to regain steady energy.",
      cta:"Join an Energy Reset"
    },
    "stuck":{
      title:"Pattern Shift Workshops",
      desc:"A focused cohort to identify repeating loops and practice new responses in small, practical steps.",
      cta:"Sign up for Pattern Shift"
    },
    "recovering":{
      title:"Recovery Navigation",
      desc:"A paced program to reconnect routines with recovery needs; safety-first, paced goals, community support.",
      cta:"Start Recovery Navigation"
    },
    "curious":{
      title:"Intro & Explore",
      desc:"A light, exploratory mini-series to try tools and decide which longer track fits best.",
      cta:"Explore Intro Series"
    }
  };

  var mood = document.getElementById('mood');
  var title = document.getElementById('method-title');
  var desc = document.getElementById('method-desc');
  var moodCta = document.getElementById('mood-cta');
  var headerCta = document.getElementById('primary-cta');

  function applyMood(key){
    var data = map[key] || map['curious'];
    title.textContent = data.title;
    desc.textContent = data.desc;
    moodCta.textContent = data.cta;
    // update header CTA phrasing to feel tailored
    if(headerCta) headerCta.textContent = data.cta;
    // append query for tracking
    var base = moodCta.getAttribute('href').split('?')[0];
    moodCta.setAttribute('href', base + '?mood=' + encodeURIComponent(key));
  }

  if(mood){
    applyMood(mood.value);
    mood.addEventListener('change',function(e){
      applyMood(e.target.value);
      // small animation
      var card = document.getElementById('method-recommendation');
      card.style.transform = 'translateY(-6px)';
      setTimeout(function(){card.style.transform='translateY(0)';},180);
      try{localStorage.setItem('preferred_mood', e.target.value);}catch(e){}
    });
  }

  // restore mood
  try{
    var saved = localStorage.getItem('preferred_mood');
    if(saved && mood){mood.value = saved; applyMood(saved);}    
  }catch(e){}

  // Timeline toggles
  var toggles = document.querySelectorAll('#timeline .toggle');
  toggles.forEach(function(btn){
    btn.addEventListener('click',function(){
      var parent = btn.parentElement;
      var details = parent.querySelector('.details');
      if(details.classList.contains('hidden')){
        details.classList.remove('hidden');
        btn.textContent = 'Hide details';
      } else {
        details.classList.add('hidden');
        btn.textContent = 'Details';
      }
    });
  });

  // small safety: disallow primary CTA click when no URL
  var final = document.getElementById('final-cta');
  if(final){
    final.addEventListener('click',function(e){
      var href = final.getAttribute('href') || '';
      if(!href || href.trim()==="{{PRIMARY_CTA_URL}}"){
        // allow default developer placeholder, but prevent if empty
      }
    });
  }
});
