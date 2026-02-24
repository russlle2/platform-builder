/* Interactivity: session planner + blend builder + small utilities */
(function(){
  // Utilities
  function $(sel){return document.querySelector(sel)}
  function $all(sel){return Array.from(document.querySelectorAll(sel))}
  function setText(el,txt){if(el)el.textContent=txt}
  function downloadFile(filename, text){const a=document.createElement('a');const blob=new Blob([text],{type:'text/plain'});a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500)}

  // Year in footer
  setText($('#year'), new Date().getFullYear())

  // Mobile nav toggle
  const navToggle = $('#navToggle')
  if(navToggle){navToggle.addEventListener('click',()=>{
    const expanded = navToggle.getAttribute('aria-expanded') === 'true'
    navToggle.setAttribute('aria-expanded', !expanded)
    document.querySelectorAll('.main-nav a').forEach(a=>{a.style.display = expanded ? 'inline' : 'block'})
  })}

  // Blend builder logic
  const buildBtn = $('#buildBlend')
  const resetBlend = $('#resetBlend')
  const blendCard = $('#blendCard')
  const dilutionGuide = $('#dilutionGuide')
  const copyBlend = $('#copyBlend')
  const downloadBlend = $('#downloadBlend')

  const vibes = {
    calm:{name:'Calm & Grounding', oils:[{o:'Lavender',note:'floral'}, {o:'Frankincense',note:'resinous'}, {o:'Vetiver',note:'earthy'}]},
    focus:{name:'Focused Clarity', oils:[{o:'Rosemary',note:'herbaceous'},{o:'Lemon',note:'citrus'},{o:'Peppermint',note:'cooling'}]},
    sleep:{name:'Sleep Ease', oils:[{o:'Lavender',note:'floral'},{o:'Roman Chamomile',note:'apple-like'},{o:'Cedarwood',note:'woodsy'}]},
    uplift:{name:'Gentle Uplift', oils:[{o:'Sweet Orange',note:'bright'},{o:'Bergamot',note:'balmy-citrus'},{o:'Ginger',note:'warm'}]}
  }

  function dilutionForApplication(app, sensitivity){
    // returns recommended percent for adults
    const base = {
      'roller_10': 2, // 2% in 10mL
      'diffuser_100': null, // drops per 100mL
      'inhaler': null
    }
    let percent = base[app]
    if(sensitivity==='sensitive' && percent) percent = Math.max(0.5, percent / 2)
    return percent
  }

  function buildBlendCard(){
    const vibeKey = $('#vibe').value
    const app = $('#application').value
    const sens = $('#sensitivity').value
    const data = vibes[vibeKey]
    if(!data) return

    // Create recipe: allocate primary/middle/supporting
    const oils = data.oils
    // default ratio for roller: 30:40:30 by drops; for diffuser: total drops
    let cardText = ''
    cardText += data.name + '\n\n'
    cardText += 'Suggested oils:\n'
    oils.forEach((it,idx)=>{cardText += (idx+1)+'. '+it.o+' — '+it.note+'\n'})

    // dilution guidance
    const percent = dilutionForApplication(app,sens)
    if(app==='roller_10'){
      // For 10mL roller: 10mL = approx 200 drops (carrier), 2% => 4 mL? Actually 2% of 10 mL = 0.2 mL = ~4 drops
      // Use drop math: 1 mL ~20 drops. So for 2% -> 4 drops total for 10 mL.
      const dropsTotal = Math.round((percent||0) * 2) // percent * 2 approximates drops for 10mL
      const perOil = Math.max(1, Math.round(dropsTotal / oils.length))
      cardText += '\nApplication: Roller (10 mL)\n'
      cardText += 'Recommended dilution: ' + (percent?percent+'%':'Adjust as needed') + '\n'
      cardText += 'Approx drops total: ' + (dropsTotal||'see note') + ' ('+perOil+' drops per listed oil)\n'
    } else if(app==='diffuser_100'){
      cardText += '\nApplication: Diffuser (100 mL)\n'
      cardText += 'Suggested drops: 6–12 drops total; start low and adjust by scent and room size.\n'
    } else if(app==='inhaler'){
      cardText += '\nApplication: Personal inhaler\n'
      cardText += 'Suggested drops: 2–4 drops on the felt, blending to preference.\n'
    }

    cardText += '\nNotes:\n- Perform a patch test if applying to skin.\n- Keep away from eyes.\n- Avoid direct use with infants and consult professionals for pregnancy or medical conditions.\n- Adjust or avoid oils if you have pets sensitive to essential oils.\n'

    // Build HTML preview
    let html = '<h3>'+data.name+'</h3>'
    html += '<ul>'
    oils.forEach(it=>{html += '<li><strong>'+it.o+'</strong> — '+it.note+'</li>'})
    html += '</ul>'
    if(app==='roller_10'){
      html += '<p><em>Roller (10 mL)</em> — recommended dilution: <strong>'+(percent?percent+'%':'varies')+'</strong>. Approx drops: '+(percent?Math.round((percent)*2):'see note')+'</p>'
    } else if(app==='diffuser_100'){
      html += '<p><em>Diffuser (100 mL)</em> — suggested 6–12 drops total; begin with 6 and increase if desired.</p>'
    } else {
      html += '<p><em>Inhaler or personal inhalation</em> — 2–4 drops on the wick. Use with caution around pets and pregnancy.</p>'
    }
    html += '<p class="muted">All guidance is safety-forward and not medical advice. Use a patch test for skin application.</p>'

    blendCard.innerHTML = html
    dilutionGuide.textContent = cardText

    // Prepare downloadable and copyable content
    const fullText = data.name + '\n\n' + cardText
    downloadBlend.href = '#'
    downloadBlend.onclick = function(e){ e.preventDefault(); downloadFile('blend-card.txt', fullText) }
    copyBlend.onclick = function(){navigator.clipboard.writeText(fullText).then(()=>{copyBlend.textContent='Copied'}).catch(()=>{copyBlend.textContent='Copy failed'})}
  }

  if(buildBtn) buildBtn.addEventListener('click', buildBlendCard)
  if(resetBlend) resetBlend.addEventListener('click', ()=>{document.getElementById('blendForm').reset(); blendCard.innerHTML=''; dilutionGuide.textContent=''; copyBlend.textContent='Copy summary'; downloadBlend.href='#'})

  // Session planner logic
  const buildPlanBtn = $('#buildPlan')
  const resetPlanBtn = $('#resetPlan')
  const planSummary = $('#planSummary')
  const copyPlan = $('#copyPlan')
  const downloadPlan = $('#downloadPlan')

  function generatePlan(){
    const intention = $('#intention').value
    const length = $('#length').value
    const focus = $('#focusArea').value.trim() || 'General'
    const format = $('#format').value
    const followup = $('#followup').value

    const now = new Date().toLocaleDateString()
    let text = 'Session plan — '+now+'\n'
    text += 'Intention: '+intention+'\n'
    text += 'Length: '+length+' minutes\n'
    text += 'Focus area: '+focus+'\n'
    text += 'Format: '+(format==='remote'?'Remote guided':'In-person')+'\n\n'
    text += 'Session outline:\n'
    text += '- Intake and safety checks (5 minutes)\n'
    if(length>30) text += '- Deeper scent exploration and guided practice ('+Math.max(10,length-20)+' minutes)\n'
    else text += '- Focused scent orientation and short guided exercise ('+Math.max(8,length-7)+' minutes)\n'
    text += '- Co-create a take-home plan: '+(followup==='both'?'blend recipe + micro-practice':followup==='blend'?'blend recipe':'short daily micro-practice')+'\n\n'
    text += 'Notes for the practitioner: Please include any pregnancy/pet flags and the client\'s skin sensitivity. Client contact: '+(document.querySelector('input#focusArea')?focus:'')+'\n'

    planSummary.value = text
    // setup download & copy
    copyPlan.onclick = function(){navigator.clipboard.writeText(text).then(()=>{copyPlan.textContent='Copied'}).catch(()=>{copyPlan.textContent='Copy failed'})}
    downloadPlan.onclick = function(e){e.preventDefault(); downloadFile('session-plan.txt', text)}
  }

  if(buildPlanBtn) buildPlanBtn.addEventListener('click', generatePlan)
  if(resetPlanBtn) resetPlanBtn.addEventListener('click', ()=>{document.getElementById('plannerForm').reset(); planSummary.value=''; copyPlan.textContent='Copy plan'; downloadPlan.href='#'})

  // Initialize links that reference placeholders (keep them unchanged)
})();