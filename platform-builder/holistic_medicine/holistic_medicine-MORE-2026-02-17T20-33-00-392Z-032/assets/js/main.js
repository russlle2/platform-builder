(function(){
  'use strict'

  // Testimonials rotating gallery
  const testimonials = [
    {quote:'After one cycle I slept better and could prioritize energy across the week. The cohort prompts were manageable.',source:'— A. (participant)'},
    {quote:'The program helped me track small wins and connect them to real shifts in my work rhythms.',source:'— M. (participant)'},
    {quote:'I appreciated the practical lens — we discussed studies and then tried small steps that fit my schedule.',source:'— S. (participant)'}
  ]

  let current = 0
  const view = document.getElementById('testimonial-view')
  const prevBtn = document.querySelector('.testimonials .prev')
  const nextBtn = document.querySelector('.testimonials .next')

  function renderTestimonial(i){
    const t = testimonials[i]
    view.innerHTML = "<blockquote class='testimonial'><p class='quote'>" + t.quote + "</p><footer class='source'>" + t.source + "</footer></blockquote>"
  }

  function nextTestimonial(){
    current = (current + 1) % testimonials.length
    renderTestimonial(current)
  }
  function prevTestimonial(){
    current = (current - 1 + testimonials.length) % testimonials.length
    renderTestimonial(current)
  }

  prevBtn.addEventListener('click', function(){ prevTestimonial() })
  nextBtn.addEventListener('click', function(){ nextTestimonial() })

  // Auto-rotate every 6s
  renderTestimonial(current)
  setInterval(nextTestimonial,6000)

  // Badges tooltip
  const badges = document.getElementById('badges')
  const tip = document.getElementById('badge-tooltip')
  badges.addEventListener('mouseover', function(e){
    const el = e.target.closest('.badge')
    if(!el) return
    const txt = el.getAttribute('data-tip') || el.title || ''
    tip.textContent = txt
    tip.style.display = 'block'
    const rect = el.getBoundingClientRect()
    tip.style.left = (rect.right + 8) + 'px'
    tip.style.top = (rect.top + window.scrollY) + 'px'
    tip.setAttribute('aria-hidden','false')
  })
  badges.addEventListener('mouseout', function(){ tip.style.display = 'none'; tip.setAttribute('aria-hidden','true') })

  // Pricing comparator: two components (hero and compact)
  function setupComparators(){
    // Primary toggle
    const toggle = document.getElementById('pricing-toggle')
    if(toggle){
      toggle.addEventListener('change', function(){
        const monthly = !toggle.checked
        document.querySelectorAll('[data-component="pricing-compare"]').forEach(function(root){
          root.querySelectorAll('.plan').forEach(function(plan){
            const numEl = plan.querySelector('.price-num')
            const unitEl = plan.querySelector('.price-unit')
            const from = parseFloat(numEl.textContent) || 0
            const to = monthly ? parseFloat(plan.getAttribute('data-month')) : parseFloat(plan.getAttribute('data-package'))
            animateNumber(numEl, from, to)
            unitEl.textContent = monthly ? '/mo' : 'one-time'
          })
        })
      })
    }

    // compact toggle (the duplicate micro comparator)
    document.querySelectorAll('.pricing-toggle-compact').forEach(function(t){
      t.addEventListener('change', function(){
        const root = t.closest('[data-component="pricing-compare"]') || document.querySelector('.pricing-compact')
        const priceEl = root.querySelector('.price-num')
        const from = parseFloat(priceEl.textContent) || 0
        const to = t.checked ? 640 : 129
        animateNumber(priceEl, from, to)
        const unit = root.querySelector('.price-unit')
        if(unit) unit.textContent = t.checked ? ' package' : '/mo'
      })
    })
  }

  // Smooth numeric animation
  function animateNumber(el, from, to){
    const duration = 420
    const start = performance.now()
    function step(now){
      const t = Math.min(1, (now - start) / duration)
      const val = Math.round(from + (to - from) * easeOutCubic(t))
      el.textContent = val
      if(t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  function easeOutCubic(t){ return (--t)*t*t+1 }

  // Initialize comparators and ensure default state
  document.addEventListener('DOMContentLoaded', function(){
    setupComparators()
  })

  // Accessibility: reveal more details on focus for badges
  badges.querySelectorAll('.badge').forEach(function(b){
    b.addEventListener('focus', function(){ const txt = b.getAttribute('data-tip'); tip.textContent = txt; tip.style.display = 'block'; tip.setAttribute('aria-hidden','false'); const rect = b.getBoundingClientRect(); tip.style.left = (rect.right + 8) + 'px'; tip.style.top = (rect.top + window.scrollY) + 'px' })
    b.addEventListener('blur', function(){ tip.style.display = 'none'; tip.setAttribute('aria-hidden','true') })
  })

})();