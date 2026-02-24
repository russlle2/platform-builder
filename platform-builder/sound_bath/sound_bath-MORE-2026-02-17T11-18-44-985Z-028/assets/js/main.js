(function(){
  // Simple DOM helpers
  function qs(sel,ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year auto-fill
  qs('#year').textContent = new Date().getFullYear();

  // Sound preference mixer
  var mixer = qs('#sound-mixer');
  var buttons = qsa('.mixer-btn', mixer);
  var output = qs('#mixer-output');
  var mixerCta = qs('#mixer-cta');

  var recommendations = {
    gentle:{title:'Recommended for gentle listening',items:['Slow breath gatherings (30 min)','Weekly reset — member seating','Short private check-ins'],cta:'events.html?filter=gentle'},
    medium:{title:'Recommended for medium intensity',items:['Rhythm-linked sessions (45 min)','Monthly member rotation','Guided breath + sound'],cta:'events.html?filter=medium'},
    intense:{title:'Recommended for deeper intensity',items:['Extended immersions (75 min)','Focused member intensives','Private deep-tune sessions'],cta:'events.html?filter=intense'}
  };

  function setMixer(level){
    buttons.forEach(function(b){b.classList.toggle('active',b.getAttribute('data-level')===level)});
    var d = recommendations[level] || recommendations.gentle;
    output.querySelector('h4').textContent = d.title;
    var ul = output.querySelector('.recs');
    ul.innerHTML = '';
    d.items.forEach(function(it){var li=document.createElement('li');li.textContent=it;ul.appendChild(li)});
    mixerCta.setAttribute('href', d.cta);
  }

  buttons.forEach(function(b){b.addEventListener('click',function(){setMixer(b.getAttribute('data-level'))})});
  // Initialize
  setMixer('gentle');

  // Testimonials rotating gallery + credibility badges tooltips
  var testimonials = [
    {text:'I arrive scattered; these practices give me a place to land weekly. Membership kept me coming back.',author:'— A. K., member'},
    {text:'The host attends to the room with care. The sessions are paced for bodies, not schedules.',author:'— L. R., consistent attendee'},
    {text:'Short sessions between workdays have been surprisingly restorative. The membership value is real.',author:'— S. M., professional'}
  ];
  var tIndex = 0;
  var tRoot = qs('#testimonials');
  function renderTestimonial(i){
    tRoot.innerHTML = '';
    var card = document.createElement('div');card.className='test-card';
    var p = document.createElement('div');p.className='test-copy';p.textContent=testimonials[i].text;
    var a = document.createElement('div');a.className='test-author';a.textContent=testimonials[i].author;
    card.appendChild(p);card.appendChild(a);tRoot.appendChild(card);
  }
  renderTestimonial(tIndex);

  // Controls
  qs('#prev-testimonial').addEventListener('click',function(){tIndex=(tIndex-1+testimonials.length)%testimonials.length;renderTestimonial(tIndex)});
  qs('#next-testimonial').addEventListener('click',function(){tIndex=(tIndex+1)%testimonials.length;renderTestimonial(tIndex)});

  // Auto-rotate every 6s
  setInterval(function(){tIndex=(tIndex+1)%testimonials.length;renderTestimonial(tIndex)},6000);

  // Badge tooltips (simple on hover, accessible tooltip via data-tip shown in CSS)
  var badges = qsa('.badge');
  badges.forEach(function(b){
    b.addEventListener('focus',function(){b.classList.add('hover')});
    b.addEventListener('blur',function(){b.classList.remove('hover')});
  });

  // Accessibility: keyboard switcher for mixer
  mixer.addEventListener('keydown', function(e){
    if(e.key==='ArrowRight' || e.key==='ArrowLeft'){
      var active = qs('.mixer-btn.active', mixer);
      var list = buttons;
      var idx = list.indexOf(active);
      if(e.key==='ArrowRight') idx = (idx+1) % list.length; else idx = (idx-1+list.length)%list.length;
      list[idx].focus(); list[idx].click();
    }
  });

})();
