(function(){
  // Basic utilities
  function qs(sel,root=document){return root.querySelector(sel)}
  function qsa(sel,root=document){return Array.from(root.querySelectorAll(sel))}

  // Set year in footer
  qs('#year').textContent = new Date().getFullYear()

  // Sample events for next-event module + calendar list (used on events page too)
  var events = [
    {id:1,title:'Evening Resonance — Community',date:'2026-03-02T18:30:00',loc:'Studio A'},
    {id:2,title:'Midday Short Set',date:'2026-03-05T12:15:00',loc:'Studio B'},
    {id:3,title:'Weekend Deep',date:'2026-03-07T10:00:00',loc:'Studio A'},
  ]

  // Next upcoming event
  function nextEvent(now, list){
    var n = list.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).find(e=>new Date(e.date)>now)
    return n||list[0]
  }
  var upcoming = nextEvent(new Date(), events)
  if(upcoming){
    var d = new Date(upcoming.date)
    qs('#nextEventDate').textContent = d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' • ' + d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})
    qs('#nextEventTitle').textContent = upcoming.title
    qs('#nextEventLoc').textContent = upcoming.loc
  }

  // Sound preference mixer
  var recommendations = {
    gentle:[
      {name:'Resting Field — 45 min',desc:'Low-sustain tones for gradual softening.'},
      {name:'Evening Ease — 60 min',desc:'Slow breath cues, subtle harmonic layers.'}
    ],
    medium:[
      {name:'Grounded Wave — 60 min',desc:'Moderate layering, movement invitations.'},
      {name:'Midday Reset — 40 min',desc:'Shorter session with rhythmic anchors.'}
    ],
    intense:[
      {name:'Tactile Resonance — 75 min',desc:'Denser sustain and tactile elements.'},
      {name:'Deep Focus Intensive — 90 min',desc:'For those seeking pronounced vibratory textures.'}
    ]
  }

  function renderRecommendation(level){
    var list = recommendations[level]||[]
    var out = list.map(function(p){
      return '<div class="rec"><strong>'+escapeHtml(p.name)+'</strong><div class="muted">'+escapeHtml(p.desc)+'</div></div>'
    }).join('')
    qs('#recommendationList').innerHTML = out
  }

  function escapeHtml(s){return String(s).replace(/[&<>\"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

  // Attach mixer buttons
  var mixer = qs('#mixer')
  if(mixer){
    qsa('.mixer-btn', mixer).forEach(function(btn){
      btn.addEventListener('click', function(){
        qsa('.mixer-btn', mixer).forEach(b=>b.classList.remove('active'))
        btn.classList.add('active')
        var level = btn.getAttribute('data-level')
        renderRecommendation(level)
        // announce to screen readers
        qs('#mixerRecommendation').setAttribute('aria-live','polite')
      })
    })
    // initialize
    renderRecommendation('gentle')
  }

  // Proof gallery: rotating testimonials
  var testimonials = [
    {text:'I left with a steadier pulse and the ability to breathe through a busy evening. The facilitation framed each tone practically.',author:'— Alina'},
    {text:'An uncluttered practice. Clear instructions, gentle instruments, and a simple way back to ordinary tasks.',author:'— Marcus'},
    {text:'We booked a private session for our team; it helped everyone move through a long day with more composure.',author:'— Council of Makers'}
  ]
  var ti = 0
  function showTestimonial(i){
    var t = testimonials[i%testimonials.length]
    qs('#testimonials .testimonial').innerHTML = '"'+escapeHtml(t.text)+'"<footer>'+escapeHtml(t.author)+'</footer>'
  }
  // initial
  showTestimonial(0)
  setInterval(function(){ti++;showTestimonial(ti)},4500)

  // Badges tooltip
  var badgeTip = qs('#badgeTip')
  qsa('.badge').forEach(function(b){
    b.addEventListener('mouseenter', function(){badgeTip.textContent = b.getAttribute('data-tip')})
    b.addEventListener('focus', function(){badgeTip.textContent = b.getAttribute('data-tip')})
    b.addEventListener('mouseleave', function(){badgeTip.textContent = ''})
  })

  // Accessibility: keyboard controls for testimonials (left/right)
  document.addEventListener('keydown', function(e){
    if(e.key==='ArrowRight'){ti++;showTestimonial(ti)}
    if(e.key==='ArrowLeft'){ti--;showTestimonial(ti)}
  })

  // Simple hydration for links to pages in sitemap (not exhaustive)
  // Build a minimal in-memory calendar list for events page if the page exists
  if(typeof window.populateEventCalendar === 'function'){
    window.populateEventCalendar(events)
  }
})();