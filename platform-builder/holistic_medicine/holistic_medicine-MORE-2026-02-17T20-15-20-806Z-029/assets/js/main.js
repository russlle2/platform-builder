(function(){
  // Utilities
  function qs(s,root=document){return root.querySelector(s)}
  function qsa(s,root=document){return Array.from(root.querySelectorAll(s))}

  // Modal logic for guided exercises
  const tryNowBtn = qs('#try-now')
  const modal = qs('#exercise-modal')
  const backdrop = qs('#modal-backdrop')
  const closeBtn = qs('.modal-close')
  const startBtn = qs('#start-exercise')
  const cancelBtn = qs('#cancel-exercise')
  const typeSelect = qs('#exercise-type')
  const exerciseArea = qs('#exercise-area')
  const titleEl = qs('#exercise-title')

  function openModal(){
    modal.setAttribute('aria-hidden','false')
    backdrop.setAttribute('aria-hidden','false')
    // set focus
    typeSelect.focus()
    renderExercisePreview(typeSelect.value)
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true')
    backdrop.setAttribute('aria-hidden','true')
    // stop any running timers
    stopCurrentExercise()
  }
  tryNowBtn && tryNowBtn.addEventListener('click',openModal)
  closeBtn && closeBtn.addEventListener('click',closeModal)
  cancelBtn && cancelBtn.addEventListener('click',closeModal)
  backdrop && backdrop.addEventListener('click',closeModal)

  // Exercise runner
  let current = {timer:null,interval:null,mode:null}

  function stopCurrentExercise(){
    if(current.timer) clearTimeout(current.timer)
    if(current.interval) clearInterval(current.interval)
    current.timer = current.interval = null
    current.mode = null
    // remove animation classes
    const circle = qs('.breath-circle')
    if(circle) circle.classList.remove('breathing')
  }

  function renderExercisePreview(mode){
    exerciseArea.innerHTML = ''
    stopCurrentExercise()
    if(mode === 'breath'){
      titleEl.textContent = 'Box breathing — a short round'
      const wrapper = document.createElement('div')
      wrapper.innerHTML = '<div class="breath-circle" aria-hidden="true">Ready</div>'
      exerciseArea.appendChild(wrapper)
    } else if(mode === 'journaling'){
      titleEl.textContent = 'Micro-journal — 5 minutes'
      const ta = document.createElement('textarea')
      ta.placeholder = 'Write for five minutes: what weighed on you, what gave energy, one tiny next step...'
      ta.style.width = '100%'
      ta.style.height = '120px'
      exerciseArea.appendChild(ta)
    } else if(mode === 'intention'){
      titleEl.textContent = 'Intention setting — quick'
      const form = document.createElement('div')
      form.innerHTML = '<input placeholder="One intention for the next hour" style="width:100%;padding:0.5rem;border-radius:8px;border:1px solid rgba(0,0,0,0.08)" />'
      exerciseArea.appendChild(form)
    }
  }

  typeSelect && typeSelect.addEventListener('change',function(e){renderExercisePreview(e.target.value)})

  // Start exercise handling
  startBtn && startBtn.addEventListener('click',function(){
    const mode = typeSelect.value
    stopCurrentExercise()
    if(mode === 'breath'){
      runBreathing()
    } else if(mode === 'journaling'){
      runJournaling(5*60)
    } else if(mode === 'intention'){
      runIntention()
    }
  })

  function runBreathing(){
    current.mode = 'breath'
    const circle = qs('.breath-circle')
    if(circle){
      circle.textContent = 'Breathe'
      // Use CSS transform to simulate slow expansion/contraction
      circle.classList.add('breathing')
      // We'll simulate 4-second cycles (in/out/hold) but keep them short for demonstration
      let phase = 0
      // If reduced motion is preferred, skip animation and just show a brief guided message
      const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if(rm){
        circle.textContent = 'Take a few slow breaths.'
        current.timer = setTimeout(()=>{
          circle.textContent = 'Finished'
        },4000)
        return
      }
      // animate by toggling transform scale
      circle.style.transition = 'transform 2000ms ease-in-out'
      let growing = true
      current.interval = setInterval(()=>{
        if(growing){
          circle.style.transform = 'scale(1.25)'
        } else {
          circle.style.transform = 'scale(0.92)'
        }
        growing = !growing
      },2000)
      // Run for 4 cycles
      current.timer = setTimeout(()=>{
        stopCurrentExercise()
        circle.textContent = 'Done — notice the change.'
        // keep message briefly
        current.timer = setTimeout(()=>{closeModal()},2000)
      },2000*4)
    }
  }

  function runJournaling(seconds){
    current.mode = 'journaling'
    const ta = qs('#exercise-area textarea')
    if(!ta){return}
    ta.focus()
    let remaining = seconds
    // show small countdown in placeholder
    const originalPlaceholder = ta.placeholder
    const updatePlaceholder = ()=> ta.placeholder = 'Time left: ' + Math.ceil(remaining/60) + 'm ' + (remaining%60) + 's'
    updatePlaceholder()
    current.interval = setInterval(()=>{
      remaining--
      if(remaining<0){
        clearInterval(current.interval);current.interval=null
        ta.placeholder = originalPlaceholder
        // save briefly to localStorage
        try{localStorage.setItem('micro-journal-'+Date.now(), ta.value.slice(0,1000))}catch(e){}
        alert('Session complete. Your entry was saved locally.')
        closeModal()
      } else updatePlaceholder()
    },1000)
  }

  function runIntention(){
    current.mode = 'intention'
    const input = qs('#exercise-area input')
    if(!input) return
    input.focus()
    // save on Enter
    function save(){
      const val = input.value.trim()
      if(!val) return alert('Write a short intention first')
      try{localStorage.setItem('intention-last', val)}catch(e){}
      alert('Intention saved. You can revisit it later.')
      closeModal()
    }
    input.addEventListener('keydown',function onKey(e){if(e.key==='Enter'){e.preventDefault();input.removeEventListener('keydown',onKey);save()}})
  }

  // Scroll reveal with IntersectionObserver, honoring prefers-reduced-motion
  function setupReveal(){
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targets = qsa('[data-reveal]')
    if(prefersReduced){
      targets.forEach(t=>t.classList.add('revealed'))
      return
    }
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('revealed')
          obs.unobserve(e.target)
        }
      })
    },{threshold:0.12})
    targets.forEach(t=>obs.observe(t))
  }

  // Lightweight smooth internal link scrolling
  document.addEventListener('click',function(e){
    const a = e.target.closest('a')
    if(!a) return
    const href = a.getAttribute('href')
    if(href && href.startsWith('#')){
      const el = document.querySelector(href)
      if(el){e.preventDefault(); el.scrollIntoView({behavior:'smooth'})}
    }
  })

  // Initialize on DOMReady
  document.addEventListener('DOMContentLoaded',function(){
    setupReveal()
  })

  // Expose some methods for testing
  window._hm = {openModal,closeModal,stopCurrentExercise}
})();
