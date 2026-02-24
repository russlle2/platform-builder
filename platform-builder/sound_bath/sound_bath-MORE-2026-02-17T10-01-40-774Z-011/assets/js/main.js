(function(){
  // Simple runtime for Mood-to-Method + Sound Mixer
  const moodButtons = document.getElementById('moodButtons');
  const soundPrefs = document.getElementById('soundPrefs');
  const programName = document.getElementById('programName');
  const programDesc = document.getElementById('programDesc');
  const programBullets = document.getElementById('programBullets');
  const dynamicBooking = document.getElementById('dynamicBooking');
  const primaryCta = document.getElementById('primaryCta');
  const footerBooking = document.getElementById('footerBooking');
  const nextEvent = document.getElementById('nextEvent');
  const prefNote = document.getElementById('prefNote');

  // state
  let state = {
    mood: localStorage.getItem('sb_mood') || 'grounded',
    intensity: localStorage.getItem('sb_intensity') || 'medium'
  };

  const moodMap = {
    grounded: {
      name: 'Grounded Flow — Short Series',
      desc: 'Slow, steady resonances to deepen bodily attention and steady the day-to-day rhythm.',
      bullets: ['4-class weekly short series','30–45 minute formats','Tools for small daily rituals'],
      ctaSuffix: 'Join the Grounded Series'
    },
    restless: {
      name: 'Focused Tone — Single Session',
      desc: 'Crisp, directing sounds to clear scattered attention and return to tasks with clarity.',
      bullets: ['Single 45-minute formats','Practical breath anchor','Takeaway cue for work transitions'],
      ctaSuffix: 'Reserve a Focused Seat'
    },
    overloaded: {
      name: 'Deep Release — Extended Session',
      desc: 'Longer, enveloping tones designed to let heavy tension unwind with guidance.',
      bullets: ['60+ minute intensives','Optional brief one-on-one prep','Aftercare notes provided'],
      ctaSuffix: 'Book a Deep Release'
    },
    curious: {
      name: 'Exploratory Mini — Tryout',
      desc: 'A compact session mixing tones and guided attention exercises to discover what helps you most.',
      bullets: ['30 minute intro','Great first-timers','Option to book a follow-up'],
      ctaSuffix: 'Try an Intro Session'
    }
  };

  const intensityNotes = {
    gentle: 'Gentle: soft timbres for calm, low-volume approach.',
    medium: 'Medium: balanced resonance suitable for most bodies.',
    intense: 'Intense: deeper vibrations for strong release; seated and lying options available.'
  };

  function render() {
    // Mood mapping
    const m = moodMap[state.mood] || moodMap.grounded;
    programName.textContent = m.name;
    programDesc.textContent = m.desc;
    programBullets.innerHTML = '';
    m.bullets.forEach(b => { const li = document.createElement('li'); li.textContent = b; programBullets.appendChild(li); });

    // Intensity mapping
    prefNote.textContent = intensityNotes[state.intensity] || intensityNotes.medium;

    // Update CTA labels
    const baseLabel = dynamicBooking.getAttribute('data-original') || dynamicBooking.textContent;
    // pick dynamic label from mood ctaSuffix if available
    const label = m.ctaSuffix || baseLabel;
    dynamicBooking.textContent = label;
    primaryCta.textContent = label;
    footerBooking.textContent = label;

    // store
    localStorage.setItem('sb_mood', state.mood);
    localStorage.setItem('sb_intensity', state.intensity);
  }

  // attach listeners
  if(moodButtons){
    moodButtons.addEventListener('click', function(e){
      const t = e.target.closest('button');
      if(!t) return;
      const mood = t.dataset.mood;
      if(mood){
        state.mood = mood;
        // highlight selection
        Array.from(moodButtons.querySelectorAll('button')).forEach(b => b.classList.toggle('active', b.dataset.mood===mood));
        render();
      }
    });
  }

  if(soundPrefs){
    soundPrefs.addEventListener('click', function(e){
      const t = e.target.closest('button');
      if(!t) return;
      const level = t.dataset.level;
      if(level){
        state.intensity = level;
        Array.from(soundPrefs.querySelectorAll('button')).forEach(b => b.classList.toggle('active', b.dataset.level===level));
        render();
      }
    });
  }

  // Prefill dynamicBooking original label
  if(dynamicBooking){
    dynamicBooking.setAttribute('data-original', dynamicBooking.textContent.trim());
  }
  // Primary CTA base
  if(primaryCta){
    primaryCta.setAttribute('data-base-label', primaryCta.textContent.trim());
    primaryCta.addEventListener('click', function(){
      // Mirror to main booking link
      window.location = dynamicBooking.getAttribute('href') || dynamicBooking.href || dynamicBooking.dataset.href || '#';
    });
  }

  // ensure some defaults selected in UI
  window.addEventListener('DOMContentLoaded', function(){
    // highlight mood and intensity buttons
    const mb = document.querySelectorAll('#moodButtons button');
    mb.forEach(b => b.classList.toggle('active', b.dataset.mood===state.mood));
    const sb = document.querySelectorAll('#soundPrefs button');
    sb.forEach(b => b.classList.toggle('active', b.dataset.level===state.intensity));

    // set year
    const yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();
    render();

    // Next event sample (could be updated via a simple rotation)
    if(nextEvent){
      // simple rotation stored
      const upcoming = [
        {when:'Sat • Mar 6',what:'Evening: "Deep Reset — Gentle Tones"'},
        {when:'Wed • Mar 10',what:'Midweek: "Focused Tone — Quick Reset"'},
        {when:'Sun • Mar 21',what:'Morning: "Grounded Flow — Short Series Intro"'}
      ];
      let idx = Number(localStorage.getItem('sb_next_idx')||0);
      const pick = upcoming[idx % upcoming.length];
      nextEvent.querySelector('.when').textContent = pick.when;
      nextEvent.querySelector('.what').textContent = pick.what;
      localStorage.setItem('sb_next_idx', (idx+1)%upcoming.length);
    }
  });

})();