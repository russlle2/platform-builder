(function(){
  // Utility
  function qs(sel,root=document){return root.querySelector(sel)}
  function qsa(sel,root=document){return Array.from(root.querySelectorAll(sel))}

  // Year
  qs('#year').textContent = new Date().getFullYear()

  // Mobile nav toggle
  const navToggle = qs('#navToggle')
  const nav = qs('#primaryNav')
  navToggle && navToggle.addEventListener('click', ()=>{
    const open = nav.classList.toggle('open')
    navToggle.setAttribute('aria-expanded', String(open))
  })

  // Scroll reveal with prefers-reduced-motion support
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const reveals = qsa('.reveal')
  if(prefersReduced){
    reveals.forEach(r=>r.classList.add('show'))
  } else if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries,obs)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('show')
          obs.unobserve(e.target)
        }
      })
    },{threshold:0.12})
    reveals.forEach(r=>io.observe(r))
  } else {
    reveals.forEach(r=>r.classList.add('show'))
  }

  // Modal logic for Guided Practice
  const tryNowBtn = qs('#tryNowBtn')
  const modal = qs('#exerciseModal')
  const backdrop = qs('#modalBackdrop')
  const closeModal = qs('#closeModal')
  const closeFooter = qs('#closeFooter')
  const tabs = qsa('.exercise-tabs button')
  const exerciseArea = qs('#exerciseArea')

  function openModal(){
    modal.setAttribute('aria-hidden','false')
    backdrop.hidden = false
    document.body.style.overflow = 'hidden'
    // default mode
    activateMode('breath')
  }
  function close(){
    modal.setAttribute('aria-hidden','true')
    backdrop.hidden = true
    document.body.style.overflow = ''
    exerciseArea.innerHTML = ''
  }
  tryNowBtn && tryNowBtn.addEventListener('click',openModal)
  closeModal && closeModal.addEventListener('click',close)
  closeFooter && closeFooter.addEventListener('click',close)
  backdrop && backdrop.addEventListener('click',close)
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ close() } })

  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>x.setAttribute('aria-selected','false'))
    t.setAttribute('aria-selected','true')
    activateMode(t.dataset.mode)
  }))

  // Modes: breathing, journaling, intention
  let breathTimer = null
  function activateMode(mode){
    clearInterval(breathTimer)
    exerciseArea.innerHTML = ''
    if(mode==='breath') renderBreath()
    if(mode==='journal') renderJournal()
    if(mode==='intention') renderIntention()
  }

  // BREATHING: simple 4-6-8 cycle with circle animation and ARIA live text
  function renderBreath(){
    const container = document.createElement('div')
    container.className = 'breath-mode'
    container.innerHTML = '\n      <div class="breath-visual" aria-hidden="true">\n        <div class="circle" id="breathCircle">\n          <div class="breath-count" id="breathCount">Ready</div>\n        </div>\n      </div>\n      <p>Follow a gentle 4-6-8 cycle. Breathe in, hold, and breathe out. Use the button to begin whenever you feel ready.</p>\n      <div style="text-align:center;margin-top:12px">\n        <button id="startBreath" class="btn primary">Begin 3 cycles</button>\n        <button id="stopBreath" class="btn">Stop</button>\n      </div>\n      <div id="ariaLive" aria-live="polite" style="position:absolute;left:-9999px"></div>'
    exerciseArea.appendChild(container)

    const start = qs('#startBreath',container)
    const stop = qs('#stopBreath',container)
    const circle = qs('#breathCircle',container)
    const count = qs('#breathCount',container)
    const aria = qs('#ariaLive')

    // cycle: inhale 4s, hold 6s, exhale 8s (single loop ~18s)
    const inhale = 4, hold = 6, exhale = 8
    let cyclesLeft = 3
    let phase = 0

    function step(){
      if(cyclesLeft<=0){
        count.textContent = 'Done'
        aria.textContent = 'Guided breathing complete.'
        circle.style.transform = 'scale(1)'
        clearInterval(breathTimer)
        return
      }
      // inhale
      phase = 1
      count.textContent = 'Breathe in'
      aria.textContent = 'Breathe in for '+inhale+' seconds.'
      circle.style.transform = 'scale(1.35)'
      setTimeout(()=>{
        // hold
        phase = 2
        count.textContent = 'Hold'
        aria.textContent = 'Hold for '+hold+' seconds.'
        circle.style.transform = 'scale(1.1)'
        setTimeout(()=>{
          // exhale
          phase = 3
          count.textContent = 'Breathe out'
          aria.textContent = 'Breathe out for '+exhale+' seconds.'
          circle.style.transform = 'scale(0.7)'
          setTimeout(()=>{ cyclesLeft -= 1 }, exhale*1000)
        }, hold*1000)
      }, inhale*1000)
    }

    start.addEventListener('click',()=>{
      cyclesLeft = 3
      step()
      breathTimer = setInterval(step, (inhale+hold+exhale)*1000)
    })
    stop.addEventListener('click',()=>{ clearInterval(breathTimer); count.textContent='Stopped'; aria.textContent='Breathing exercise stopped.'; circle.style.transform='scale(1)'; })
  }

  // JOURNAL: simple textarea and save to localStorage
  function renderJournal(){
    const container = document.createElement('div')
    container.className = 'journal-mode'
    container.innerHTML = '\n      <div class="journal-area">\n        <label for="journalText">A short prompt: "What would help you today?"</label>\n        <textarea id="journalText" placeholder="Write a few lines..." aria-label="Journal entry"></textarea>\n        <div style="display:flex;gap:8px;margin-top:8px">\n          <button id="saveJournal" class="btn primary">Save</button>\n          <button id="clearJournal" class="btn">Clear</button>\n          <span id="journalMsg" style="margin-left:auto;color:var(--muted)"></span>\n        </div>\n      </div>'
    exerciseArea.appendChild(container)
    const ta = qs('#journalText',container)
    const save = qs('#saveJournal',container)
    const clear = qs('#clearJournal',container)
    const msg = qs('#journalMsg',container)
    // load
    try{ ta.value = localStorage.getItem('pp_journal') || '' }catch(e){}
    save.addEventListener('click',()=>{
      try{ localStorage.setItem('pp_journal', ta.value); msg.textContent='Saved locally'; setTimeout(()=>msg.textContent='',1800) }catch(e){ msg.textContent='Could not save' }
    })
    clear.addEventListener('click',()=>{ ta.value=''; try{ localStorage.removeItem('pp_journal'); msg.textContent='Cleared'; setTimeout(()=>msg.textContent='',1400)}catch(e){}})
  }

  // INTENTION: small prompt and optional reminder copy
  function renderIntention(){
    const container = document.createElement('div')
    container.className = 'intention-mode'
    container.innerHTML = '\n      <div class="intention-area">\n        <label for="intent">Set a concise intention for today</label>\n        <input id="intent" placeholder="One short sentence...">\n        <div style="display:flex;gap:8px;margin-top:8px">\n          <button id="saveIntent" class="btn primary">Keep</button>\n          <button id="dismissIntent" class="btn">Dismiss</button>\n          <span id="intentMsg" style="margin-left:auto;color:var(--muted)"></span>\n        </div>\n      </div>'
    exerciseArea.appendChild(container)
    const input = qs('#intent',container)
    const save = qs('#saveIntent',container)
    const dismiss = qs('#dismissIntent',container)
    const msg = qs('#intentMsg',container)
    try{ input.value = localStorage.getItem('pp_intent') || '' }catch(e){}
    save.addEventListener('click',()=>{ try{ localStorage.setItem('pp_intent', input.value); msg.textContent='Kept'; setTimeout(()=>msg.textContent='',1400)}catch(e){ msg.textContent='Error' } })
    dismiss.addEventListener('click',()=>{ input.value=''; try{ localStorage.removeItem('pp_intent'); msg.textContent='Removed'; setTimeout(()=>msg.textContent='',1400)}catch(e){}})
  }

  // Accessibility: focus trap minimal
  document.addEventListener('focusin', (e)=>{
    if(modal.getAttribute('aria-hidden')==='false'){
      // keep focus inside modal
      if(!modal.contains(e.target)){
        e.preventDefault(); qs('#closeModal').focus()
      }
    }
  })

  // Basic link fallback for CTA (keeps placeholder intact)
  qsa('a').forEach(a=>{ if(a.getAttribute('href') === '{{PRIMARY_CTA_URL}}'){ a.addEventListener('click',(e)=>{ /* allow template system to inject */ }) } })

})();