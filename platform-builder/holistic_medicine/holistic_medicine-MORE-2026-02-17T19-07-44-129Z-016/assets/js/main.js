// Session Planner + Whole-person inventory
(function(){
  function qs(sel,ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  var buildBtn = qs('#build-plan')
  var downloadBtn = qs('#download-plan')
  var planOutput = qs('#plan-output')

  function buildPlan(){
    var start = qs('#start-month').value || 'as soon as convenient'
    var length = qs('#session-length').value
    var num = parseInt(qs('#num-sessions').value,10)||6
    var format = qs('#format').value
    var focuses = qsa('.focus:checked').map(function(i){return i.value})

    var rhythm = format==='cohort' ? 'weekly group lessons with clinician office hours' : 'one-on-one sessions'

    var header = 'Personal session plan — generated\n'
    header += 'Start: '+start+'\n'
    header += 'Session length: '+length+' minutes | Total sessions: '+num+'\n'
    header += 'Format: '+(format==='cohort'? 'Guided cohort' : 'Private series')+' ('+rhythm+')\n\n'

    var body = 'Focus areas:\n'
    if(focuses.length){
      focuses.forEach(function(f,idx){body += (idx+1)+'. '+f+'\n'})
    } else { body += '- General whole-person review and priorities\n' }

    body += '\nWeekly plan snapshot:\n'
    var weeks = Math.max(1,num)
    for(var w=1;w<=weeks;w++){
      body += 'Week '+w+': ' + (focuses[w-1] || focuses[(w-1)%Math.max(1,focuses.length)] || 'Review & adjustments') + ' ; homework: 1 clear metric to track (sleep/nutrition/movement)\n'
    }

    body += '\nClinician notes (starter):\n- Intake review in first session\n- Prioritize one measurable goal\n- Use small-data checks mid-week\n\nFollow-up suggestions:\n'
    var cadence = num<=4 ? 'Bi-weekly check-ins for short sequences' : 'Weekly check-ins during the cohort, then monthly check-ins for 2–3 months'
    body += cadence + '\n'

    var text = header + body
    planOutput.textContent = text
    return text
  }

  function copyText(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text)
    } else {
      var ta = document.createElement('textarea')
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      return Promise.resolve()
    }
  }

  buildBtn.addEventListener('click', function(){ buildPlan() })
  downloadBtn.addEventListener('click', function(){
    var txt = planOutput.textContent || buildPlan()
    copyText(txt).then(function(){
      downloadBtn.textContent = 'Copied!'
      setTimeout(function(){ downloadBtn.textContent = 'Copy summary' },1500)
    })
  })

  // Inventory -> agenda & cadence
  var invBtn = qs('#make-agenda')
  var copyAgenda = qs('#copy-agenda')
  var agendaOutput = qs('#agenda-output')

  function makeAgenda(){
    var picks = qsa('.inv:checked').map(function(i){return i.value})
    if(picks.length===0){
      agendaOutput.textContent = 'No areas selected. Try ticking 2–4 areas for a focused agenda.'
      return agendaOutput.textContent
    }

    var agenda = 'Consultation agenda (short):\n'
    agenda += '- 10 min: Current context & priority concern(s)\n'
    agenda += '- 15 min: Targeted history for selected areas\n'
    agenda += '- 20 min: Behavior & environment review + simple measurements\n'
    agenda += '- 15 min: Agree on 2 practical experiments and data to collect\n\n'

    agenda += 'Suggested focus order:\n'
    picks.forEach(function(p,idx){ agenda += (idx+1)+'. '+p+'\n' })

    agenda += '\nFollow-up cadence suggestion:\n'
    if(picks.length<=2){
      agenda += '- Two short check-ins at 2-week intervals, then monthly review\n'
    } else if(picks.length<=4){
      agenda += '- Weekly check-ins for the first 6 weeks, then tailor cadence\n'
    } else {
      agenda += '- Start with a single focused primary aim for 4 weeks; clinician will triage additional areas. Follow-ups every 7–10 days initially.\n'
    }

    agenda += '\nPractical first steps:\n- Pick one metric to track for each selected area (sleep hours, number of bowel movements, mood rating, step count).\n- Plan 1 small habit change this week per area.\n'

    agendaOutput.textContent = agenda
    return agenda
  }

  invBtn.addEventListener('click', function(){ makeAgenda() })
  copyAgenda.addEventListener('click', function(){
    var text = agendaOutput.textContent || makeAgenda()
    copyText(text).then(function(){
      copyAgenda.textContent = 'Copied!'
      setTimeout(function(){ copyAgenda.textContent = 'Copy agenda' },1400)
    })
  })

  // Small UX: press Ctrl+Enter to build plan
  document.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.key==='Enter'){
      buildPlan(); makeAgenda();
    }
  })
})();
