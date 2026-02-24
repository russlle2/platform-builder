(function(){
  'use strict'

  // Simple mobile toggle
  var mobileToggle=document.querySelector('.mobile-toggle')
  var nav=document.querySelector('.main-nav')
  mobileToggle&&mobileToggle.addEventListener('click',function(){
    var expanded=this.getAttribute('aria-expanded')==='true'
    this.setAttribute('aria-expanded', String(!expanded))
    if(!expanded){ nav.style.display='block' } else { nav.style.display='none' }
  })

  // Scroll reveal with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if(prefersReduced){
    document.querySelectorAll('[data-reveal]').forEach(function(el){ el.classList.add('show') })
  } else if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('show'); io.unobserve(e.target) }
      })
    },{threshold:0.12})
    document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el) })
  } else {
    // fallback: show all
    document.querySelectorAll('[data-reveal]').forEach(function(el){ el.classList.add('show') })
  }

  // Guided exercise modal logic
  var tryBtn=document.getElementById('try-now')
  var modal=document.getElementById('guide-modal')
  var overlay=document.getElementById('overlay')
  var closeBtn=document.querySelector('.modal-close')
  var guideBtns=document.querySelectorAll('.guide-btn')
  var startBtn=document.getElementById('start-guide')
  var resetBtn=document.getElementById('reset-guide')
  var guideText=document.querySelector('.guide-text')
  var breathCircle=document.querySelector('.breath-circle')
  var currentMode=null
  var breathTimer=null
  var breathPhase=0

  function openModal(){ modal.setAttribute('aria-hidden','false'); overlay.hidden=false }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); overlay.hidden=true; stopBreathing() }

  tryBtn&&tryBtn.addEventListener('click',openModal)
  closeBtn&&closeBtn.addEventListener('click',closeModal)
  overlay&&overlay.addEventListener('click',closeModal)

  guideBtns.forEach(function(b){ b.addEventListener('click',function(){
    guideBtns.forEach(function(x){ x.classList.remove('active') })
    b.classList.add('active')
    currentMode=b.getAttribute('data-mode')
    updateGuideText('selected')
  })})

  startBtn&&startBtn.addEventListener('click',function(){
    if(!currentMode){ updateGuideText('pick') ; return }
    if(currentMode==='breath') startBreathing()
    else if(currentMode==='journal') startJournaling()
    else if(currentMode==='intention') startIntention()
  })

  resetBtn&&resetBtn.addEventListener('click',function(){ stopBreathing(); updateGuideText('reset') })

  function updateGuideText(state){
    if(state==='pick'){
      guideText.textContent='Please pick a practice to begin.'
    } else if(state==='selected'){
      if(currentMode==='breath') guideText.textContent='A two-minute breathing practice: follow the expansion of the circle.'
      if(currentMode==='journal') guideText.textContent='A short journaling prompt will be shown; write freely for five minutes.'
      if(currentMode==='intention') guideText.textContent='Set a single short intention you can remember through the day.'
    } else if(state==='reset'){
      guideText.textContent='The practice has been reset. Choose another or close the window.'
    }
  }

  function startBreathing(){
    var totalCycles=6 // approx 2 minutes (inhale 4s, hold 2s, exhale 4s)
    var count=0
    breathPhase=0
    updateGuideText('selected')
    // accessibility: announce
    guideText.textContent='Begin: inhale as the circle expands. Exhale as it contracts.'
    // animate circle via transform
    function cycle(){
      if(count>=totalCycles){ stopBreathing(); guideText.textContent='Practice complete. Take a moment and return when ready.'; return }
      // inhale expand
      breathCircle.style.transform='scale(1.6)'
      setTimeout(function(){
        // hold - small pause
        setTimeout(function(){
          // exhale contract
          breathCircle.style.transform='scale(1)'
          setTimeout(function(){
            count++
            cycle()
          },4000) // exhale duration
        },2000) // hold
      },4000) // inhale
    }
    cycle()
  }

  function stopBreathing(){
    if(breathTimer){ clearTimeout(breathTimer); breathTimer=null }
    if(breathCircle) breathCircle.style.transform='scale(1)'
  }

  function startJournaling(){
    // Provide a prompt and a simple auto-timer
    guideText.innerHTML='Prompt: What small change would make your day easier?\nWrite for five minutes.'
    // Create a simple inline textarea if not present
    var stage=document.querySelector('.guide-stage')
    var ta=stage.querySelector('textarea')
    if(!ta){ ta=document.createElement('textarea'); ta.rows=8; ta.placeholder='Write freely...'; ta.style.width='100%'; ta.style.marginTop='1rem'; stage.appendChild(ta) }
    ta.focus()
  }

  function startIntention(){
    guideText.textContent='Choose one short intention (a sentence or a few words) and say it aloud or write it down.'
    var stage=document.querySelector('.guide-stage')
    var input=stage.querySelector('input')
    if(!input){ input=document.createElement('input'); input.type='text'; input.placeholder='My intention is...'; input.style.width='100%'; input.style.marginTop='1rem'; stage.appendChild(input) }
    var inputEl=stage.querySelector('input')
    inputEl.focus()
  }

  // accessible year update
  document.querySelectorAll('.year').forEach(function(el){ el.textContent=new Date().getFullYear() })

})();
