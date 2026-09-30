/* Gallery "what is this?" helper (shared by gallery-main.html and gallery-misc.html).
   Click the "?" at the top right -> a cursor swipes across it, erasing it, and a
   "what is this?" label is typed out of the (shortened) cursor, one letter at a time, growing
   leftwards as the cursor stays put. Closing plays the same thing in reverse: the label is
   backspaced into the cursor, which then swipes back left, revealing the "?" again.
   Click the label -> the text from <template id="gallery-intro-text"> is typed out above the
   image, pushing it down as it goes; "what is this?" stays where it is. When the text has finished,
   "ok got it" appears below it and hides both the text and the label. */
(function(){
  var mark   = document.getElementById("help-mark");
  var bubble = document.getElementById("help-bubble");
  var intro  = document.getElementById("gallery-intro");
  var tpl    = document.getElementById("gallery-intro-text");
  if(!mark || !bubble || !intro || !tpl) return;

  var paras = [].map.call(tpl.content.querySelectorAll("p"), function(p){
    return p.textContent.replace(/\s+/g, " ").trim();
  }).filter(Boolean);

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SPEED = 28;          // ms per character
  var timer = null, shown = false;

  // Open/close animation. Keep SWIPE_MS and GROW_MS in step with the transition times in styles.css
  // (.help-glyph / .help-cursor for the swipe, .help-cursor transform for the shrink).
  var wrap = mark.parentNode;
  var SWIPE_MS = reduceMotion ? 0 : 850, GROW_MS = reduceMotion ? 0 : 300;
  var LABEL_TYPE_MS = 55, LABEL_ERASE_MS = 32;   // ms per letter typing out / backspacing the label

  // The label is typed into the button letter by letter; the full text lives in aria-label meanwhile.
  var LABEL = bubble.textContent.replace(/\s+/g, " ").trim();
  bubble.setAttribute("aria-label", LABEL);
  bubble.textContent = "";
  var labelTimer = null;
  function typeLabel(erase, done){
    var n = erase ? LABEL.length : 0;
    clearTimeout(labelTimer);
    if(reduceMotion){ bubble.textContent = erase ? "" : LABEL; done(); return; }
    (function tick(){
      n += erase ? -1 : 1;
      bubble.textContent = LABEL.slice(0, n);
      if(erase ? n <= 0 : n >= LABEL.length){ labelTimer = setTimeout(done, erase ? 120 : 60); return; }
      var base = erase ? LABEL_ERASE_MS : LABEL_TYPE_MS;
      labelTimer = setTimeout(tick, base + (erase ? 0 : Math.random() * 35 - 12));
    })();
  }
  var helpState = "closed";                // closed -> opening -> open -> closing -> closed

  function openHelp(){
    if(helpState !== "closed") return;
    helpState = "opening";
    mark.setAttribute("aria-expanded", "true");
    wrap.classList.add("cursor-on", "swiped");        // cursor appears and swipes right, erasing the "?"
    setTimeout(function(){
      wrap.classList.add("compact");                   // at the right margin: it shrinks to text size...
      setTimeout(function(){
        bubble.classList.add("open");
        typeLabel(false, function(){                   // ...and the label is typed out of it, leftwards
          wrap.classList.add("blink");                 // then it goes back to blinking
          helpState = "open";
        });
      }, GROW_MS * 0.8);
    }, SWIPE_MS);
  }
  function closeHelp(){
    if(helpState !== "open") return;
    helpState = "closing";
    mark.setAttribute("aria-expanded", "false");
    wrap.classList.remove("blink");                    // cursor stays solid while it backspaces the label
    typeLabel(true, function(){
      bubble.classList.remove("open");
      wrap.classList.remove("compact");                // the cursor grows back to full size...
      setTimeout(function(){
        wrap.classList.remove("swiped");               // ...then swipes back left, revealing the "?"
        setTimeout(function(){
          wrap.classList.remove("cursor-on");          // and disappears
          helpState = "closed";
        }, SWIPE_MS);
      }, GROW_MS);
    });
  }
  function stop(){ if(timer){ clearTimeout(timer); timer = null; } }

  function renderPlain(){
    intro.textContent = "";
    paras.forEach(function(t){
      var p = document.createElement("p");
      p.textContent = t;
      intro.appendChild(p);
    });
  }
  function finish(){
    stop();
    renderPlain();                         // swap the typing markup for clean text
    intro.removeAttribute("aria-busy");
    // "ok got it" on its own line under the text; fades in (see .gallery-intro-close in styles.css)
    var line = document.createElement("p");
    line.className = "gallery-intro-close";
    var ok = document.createElement("button");
    ok.type = "button";
    ok.className = "gallery-intro-ok";
    // \uFE0E (variation selector-15) asks phones to draw the arrow as a text glyph, not an emoji
    ok.textContent = "ok got it \u2934\uFE0E";
    ok.addEventListener("click", dismiss);
    line.appendChild(ok);
    intro.appendChild(line);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ line.classList.add("visible"); }); });
  }

  function startTyping(){
    stop();
    intro.textContent = "";
    shown = true;
    if(reduceMotion){ finish(); return; }
    intro.setAttribute("aria-busy", "true");

    var words = paras.map(function(t){ return t.split(" "); });
    var pi = 0, wi = 0, ci = 0;            // paragraph, word, character
    var p = null, shownNode = null, rest = null;
    var caret = document.createElement("span");
    caret.className = "tw-caret";

    function step(){
      if(pi >= paras.length){ finish(); return; }
      var w = words[pi][wi];
      if(ci === 0){
        if(!p){ p = document.createElement("p"); intro.appendChild(p); }
        // Each word is a no-wrap span whose not-yet-typed letters are invisible but still take up
        // room, so a word moves to the next line before it is typed rather than jumping mid-word.
        var span = document.createElement("span");
        span.className = "tw-word";
        shownNode = document.createTextNode("");
        rest = document.createElement("span");
        rest.className = "tw-rest";
        span.appendChild(shownNode);
        span.appendChild(caret);
        span.appendChild(rest);
        if(wi > 0) p.appendChild(document.createTextNode(" "));
        p.appendChild(span);
      }
      ci++;
      shownNode.data = w.slice(0, ci);
      rest.textContent = w.slice(ci);

      var delay = SPEED, ch = w.charAt(ci - 1);
      if(/[.!?]/.test(ch)) delay += 260; else if(/[,;:]/.test(ch)) delay += 120;
      if(ci >= w.length){
        ci = 0; wi++;
        if(wi >= words[pi].length){ pi++; wi = 0; p = null; delay += 320; }
      }
      timer = setTimeout(step, delay);
    }
    step();
  }

  // Hides the text and slides the "what is this?" label back into the image.
  function dismiss(){
    stop();
    intro.textContent = "";
    intro.removeAttribute("aria-busy");
    shown = false;
    closeHelp();
    mark.focus();
  }

  mark.addEventListener("click", function(){
    if(helpState === "opening" || helpState === "closing") return;   // let the animation finish
    if(shown){ dismiss(); return; }
    if(helpState === "open"){ closeHelp(); } else { openHelp(); }
  });
  bubble.addEventListener("click", function(){
    if(helpState === "open" && !shown) startTyping();   // the label stays put while the text is typed
  });
  document.addEventListener("keydown", function(e){
    if(e.key !== "Escape") return;
    if(shown){ dismiss(); }
    else if(helpState === "open"){ closeHelp(); }
  });
})();
