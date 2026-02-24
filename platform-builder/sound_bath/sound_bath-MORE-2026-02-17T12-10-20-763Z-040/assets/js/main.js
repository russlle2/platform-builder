// Local JS for seat selector, packing list generator, and guided exercise modals
(function(){
  // Basic helpers
  function $(sel, ctx){return (ctx||document).querySelector(sel)}
  function $all(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year update
  $('#year').textContent = new Date().getFullYear()

  // Seat selector logic (local demo)
  var seatRange = $('#seat-count')
  var seatNumber = $('#seat-number')
  var available = $('#available-spots')
  var reserveBtn = $('#reserve')
  var spots = 6 // initial

  function updateSeats(){
    seatNumber.textContent = seatRange.value
  }
  seatRange.addEventListener('input', updateSeats)

  reserveBtn.addEventListener('click', function(){
    var want = parseInt(seatRange.value,10)
    if(want <= spots){
      spots -= want
      available.textContent = spots
      alert('Local demo: held ' + want + ' seat(s). This is a mock reservation.')
      if(spots === 0){
        reserveBtn.disabled = true
      }
    } else {
      alert('Not enough spots available in this demo.')
    }
  })

  // Packing list generator
  var packForm = $('#packing-form')
  var packGen = $('#pack-generate')
  var packReset = $('#pack-reset')
  var packOut = $('#packing-output')

  function generatePacking(){
    var checks = packForm.querySelectorAll('input[name="items"]:checked')
    if(checks.length === 0){
      packOut.textContent = 'No items selected — consider a cozy blanket and a bottle of water.'
      return
    }
    var lines = ['Bring these to the session:']
    checks.forEach(function(c,i){ lines.push((i+1)+'. '+ c.parentNode.textContent.trim()) })
    lines.push('\nQuick tips:\n- Layer clothing\n- Arrive 10 minutes early\n- Keep your phone on low or airplane mode')
    packOut.textContent = lines.join('\n')
  }
  packGen.addEventListener('click', generatePacking)
  packReset.addEventListener('click', function(){
    $all('input[name="items"]', packForm).forEach(function(i){i.checked=false})
    packOut.textContent = ''
  })

  // Guided exercise modal
  var modal = $('#modal')
  var tryBtn = $('#try-now')
  var modalClose = $('#modal-close')
  var modalTitle = $('#modal-title')
  var modalBody = $('#modal-body')
  var modalStart = $('#modal-start')
  var modalSkip = $('#modal-skip')
  var tabs = $all('.modal-tabs .tab')
  var currentMode = 'breath'
  var breathTimer = null

  function openModal(){
    modal.setAttribute('aria-hidden','false')
    document.body.style.overflow = 'hidden'
    renderModal(currentMode)
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true')
    document.body.style.overflow = ''
    stopBreath()
  }
  tryBtn.addEventListener('click', openModal)
  modalClose.addEventListener('click', closeModal)
  modalSkip.addEventListener('click', closeModal)

  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(x){x.classList.remove('active')})
      t.classList.add('active')
      currentMode = t.getAttribute('data-mode')
      renderModal(currentMode)
    })
  })

  function renderModal(mode){
    if(mode==='breath'){
      modalTitle.textContent = 'Short breathing guide'
      modalBody.innerHTML = ''
      var p = document.createElement('p')
      p.textContent = 'A short 3-minute breathing anchor: follow the circle and breathe with the cue.'
      var circle = document.createElement('div')
      circle.id = 'breath-circle'
      circle.className = 'breath-circle'
      var guide = document.createElement('p')
      guide.id = 'breath-guide'
      guide.className = 'muted small'
      guide.textContent = 'Ready? Press Start.'
      modalBody.appendChild(p)
      modalBody.appendChild(circle)
      modalBody.appendChild(guide)
    } else if(mode==='journal'){
      modalTitle.textContent = 'Two-minute journaling prompt'
      modalBody.innerHTML = ''
      var p = document.createElement('p')
      p.textContent = 'Write for two minutes: a prompt to clear the edges of your day.'
      var prompt = document.createElement('blockquote')
      prompt.textContent = 'What do I want to carry forward from today, and what can I leave behind?'
      prompt.style.padding='10px'; prompt.style.background='#f6fffe'; prompt.style.borderRadius='8px'; prompt.style.marginTop='8px'
      var textarea = document.createElement('textarea')
      textarea.rows = 6; textarea.style.width='100%'; textarea.placeholder='Write a few lines...'
      modalBody.appendChild(p)
      modalBody.appendChild(prompt)
      modalBody.appendChild(textarea)
    }
  }

  modalStart.addEventListener('click', function(){
    if(currentMode==='breath'){
      startBreath()
    } else {
      startJournalTimer()
    }
  })

  function startBreath(){
    var guide = $('#breath-guide')
    var circle = $('#breath-circle')
    var steps = [ {label:'Breathe in',ms:4000},{label:'Hold',ms:2000},{label:'Breathe out',ms:6000} ]
    var i=0
    guide.textContent = steps[0].label
    circle.style.transition = 'transform 4s ease-in-out'
    circle.style.transform = 'scale(1.2)'
    stopBreath()
    breathTimer = setInterval(function(){
      i = (i+1) % steps.length
      guide.textContent = steps[i].label
      // alter scale for simple visual cue
      if(steps[i].label==='Breathe in'){
        circle.style.transition = 'transform 4s ease-in-out'
        circle.style.transform = 'scale(1.2)'
      } else if(steps[i].label==='Hold'){
        circle.style.transition = 'transform 2s ease-in-out'
        circle.style.transform = 'scale(1.05)'
      } else {
        circle.style.transition = 'transform 6s ease-in-out'
        circle.style.transform = 'scale(0.75)'
      }
    }, 4000)
    // auto-stop after ~3 minutes (180s)
    setTimeout(function(){ stopBreath(); guide.textContent='Session complete — take a gentle moment.' }, 180000)
  }
  function stopBreath(){ if(breathTimer){ clearInterval(breathTimer); breathTimer=null } }

  function startJournalTimer(){
    var start = Date.now();
    modalStart.disabled = true
    modalSkip.disabled = true
    var seconds = 120
    var info = document.createElement('div')
    info.id='journal-timer'
    info.textContent = 'Write freely for 2 minutes — timer running: 120s'
    modalBody.appendChild(info)
    var t = setInterval(function(){
      var left = seconds - Math.round((Date.now()-start)/1000)
      if(left <= 0){
        clearInterval(t)
        modalStart.disabled = false
        modalSkip.disabled = false
        info.textContent = 'Time is up — consider what surfaced.'
      } else {
        info.textContent = 'Write for: ' + left + 's'
      }
    }, 300)
  }

  // Initialize modal content
  renderModal(currentMode)

  // Small ARIA-friendly escape to close modal
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeModal() })

})();
