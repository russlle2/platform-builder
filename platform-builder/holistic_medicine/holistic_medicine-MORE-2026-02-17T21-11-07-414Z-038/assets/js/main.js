(function(){
  // Utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}
  function nowYear(){return new Date().getFullYear()}
  document.getElementById('year').textContent = nowYear()

  // Session Planner
  var buildBtn = qs('#build-plan')
  var clearBtn = qs('#clear-plan')
  var copyPlanBtn = qs('#copy-plan')
  var downloadPlan = qs('#download-plan')
  var planText = qs('#plan-text')

  function getSelectedChips(){
    return qsa('#focus-chips input:checked').map(function(i){return i.value})
  }
  function getSelectedModalities(){
    return qsa('#modalities option:checked').map(function(o){return o.textContent})
  }

  function buildPlan(){
    var goal = qs('#goal').value.trim() || '—'
    var length = qs('#length').value
    var cadence = qs('#cadence').value
    var chips = getSelectedChips()
    var modalities = getSelectedModalities()
    var notes = qs('#notes').value.trim()

    var lines = []
    lines.push('Session Plan — ' + (new Date()).toLocaleDateString())
    lines.push('Business: {{BUSINESS_NAME}}')
    lines.push('Primary goal: ' + goal)
    lines.push('Session length: ' + length + ' | Cadence: ' + cadence)
    if(chips.length) lines.push('Focus areas: ' + chips.join(', '))
    if(modalities.length) lines.push('Preferred modalities: ' + modalities.join(', '))
    if(notes) lines.push('\nNotes: ' + notes)

    lines.push('\nSuggested structure:')
    lines.push('- Intake & priorities (10–20% of time)')
    lines.push('- Targeted tools and homework (40–60%)')
    lines.push('- Tracking plan and next steps (20–30%)')

    lines.push('\nOne-page action checklist:')
    chips.slice(0,4).forEach(function(c,i){
      lines.push((i+1)+'. '+c+' — small, measurable step')
    })
    lines.push('\nFollow-up items:')
    lines.push('- Check progress at next visit ('+cadence.toLowerCase()+')')

    var out = lines.join('\n')
    planText.value = out
    // set download href as blob
    var blob = new Blob([out],{type:'text/plain'})
    downloadPlan.href = URL.createObjectURL(blob)
  }

  function clearPlan(){
    qs('#planner-form').reset()
    planText.value = ''
    downloadPlan.href = ''
  }

  buildBtn.addEventListener('click', function(e){buildPlan()})
  clearBtn.addEventListener('click', clearPlan)
  copyPlanBtn.addEventListener('click', function(){
    navigator.clipboard.writeText(planText.value).then(function(){
      copyPlanBtn.textContent = 'Copied'
      setTimeout(function(){copyPlanBtn.textContent = 'Copy'},1500)
    })
  })

  // Inventory -> agenda and cadence
  var invBuild = qs('#build-agenda')
  var invClear = qs('#clear-inv')
  var agendaText = qs('#agenda-text')
  var cadenceText = qs('#cadence-text')
  var copyAgenda = qs('#copy-agenda')

  function buildAgenda(){
    var picks = qsa('#inventory-form input:checked').map(function(i){return i.value})
    if(!picks.length){
      agendaText.value = 'No areas selected.'
      cadenceText.value = 'N/A'
      return
    }
    var agendaLines = []
    agendaLines.push('Consultation agenda — topics to cover:')
    picks.forEach(function(p){
      agendaLines.push('- '+p+': brief review, current barriers, one prioritized step')
    })
    agendaLines.push('\nSuggested duration: 45–60 minutes for a broad review; shorter visits for narrow follow-ups.')

    // cadence calculation: more items -> tighter early cadence
    var cadence = ''
    if(picks.length <=2) cadence = 'Every 3–4 weeks for 2–3 visits to consolidate changes.'
    else if(picks.length <=5) cadence = 'Every 2 weeks initially for 6–8 weeks, then reassess.'
    else cadence = 'Weekly or bi-weekly short check-ins, with a mid-cycle 45–60 minute review.'

    agendaText.value = agendaLines.join('\n')
    cadenceText.value = 'Recommended follow-up: ' + cadence
  }

  function clearInventory(){
    qs('#inventory-form').reset()
    agendaText.value = ''
    cadenceText.value = ''
  }

  invBuild.addEventListener('click', buildAgenda)
  invClear.addEventListener('click', clearInventory)
  copyAgenda.addEventListener('click', function(){
    var text = agendaText.value + '\n\n' + cadenceText.value
    navigator.clipboard.writeText(text).then(function(){
      copyAgenda.textContent = 'Copied'
      setTimeout(function(){copyAgenda.textContent = 'Copy agenda'},1500)
    })
  })

  // small accessibility: allow Enter to build
  document.addEventListener('keypress', function(e){
    if(e.key === 'Enter' && (document.activeElement && document.activeElement.tagName !== 'TEXTAREA')){
      if(document.activeElement.closest && document.activeElement.closest('#planner-form')){
        e.preventDefault(); buildPlan()
      }
    }
  })

})();