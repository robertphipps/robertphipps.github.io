/* Gallery "what is this?" helper (shared by gallery-main.html and gallery-misc.html).
   Hover the bullet at the top right (on touch devices: press it) -> the bullet shrinks into the dot of a
   "?", the rest of the "?" appears above it, and "what is this" is typed out leftwards from the "?" so the
   phrase ends in that "?". Moving the pointer away (on touch devices: tapping outside) plays it backwards.
   Escape also closes it.
   Click the label or the "?" -> the text from <template id="gallery-intro-text"> is typed out above the
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

  var wrap = mark.parentNode;
  var qBox   = wrap.querySelector(".help-q");
  var qGlyph = wrap.querySelector(".help-q-glyph");
  var dotEl  = wrap.querySelector(".help-glyph");
  // Keep DOT_MS and Q_MS in step with the transitions in styles.css (.help-glyph::before and .help-q).
  var DOT_MS = reduceMotion ? 0 : 420, Q_MS = reduceMotion ? 0 : 160;
  var LABEL_TYPE_MS = 55, LABEL_ERASE_MS = 32;   // ms per letter typing out / backspacing the label

  // The label is typed into the button letter by letter; the "?" at its end is the separate .help-q layer.
  var LABEL = bubble.textContent.replace(/\s+/g, " ").trim().replace(/\?$/, "");
  bubble.setAttribute("aria-label", LABEL + "?");
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

  // --- Where the bullet has to go to become the dot of the "?" --------------------------------------
  // The "?" is a real glyph in the page font, drawn with its own dot clipped away; the bullet shrinks and
  // glides onto the spot where that dot would be. To find it, the "?" is drawn on a canvas in the same font
  // and the dot (the ink below the gap under the hook) is measured. Redone when the font loads / on resize.
  function measure(){
    if(!qGlyph || !qBox || !dotEl) return;
    var cs  = getComputedStyle(qGlyph);
    var F   = parseFloat(cs.fontSize);
    var gap = parseFloat(getComputedStyle(wrap).getPropertyValue("--help-q-gap")) || 0;
    var w   = qGlyph.offsetWidth, gH = qGlyph.offsetHeight;
    var boxW = qBox.offsetWidth, boxH = qBox.offsetHeight;
    bubble.style.marginRight = (gap + w) + "px";       // label sits flush against the "?"
    qGlyph.style.clipPath = "";
    try{
      var S = 4, pad = Math.ceil(F * S * 0.5);
      var cv = document.createElement("canvas"), ctx = cv.getContext("2d");
      var font = cs.fontStyle + " " + cs.fontWeight + " " + (F * S) + "px " + cs.fontFamily;
      ctx.font = font;
      var m = ctx.measureText("?");
      var asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      if(asc == null || desc == null){ asc = F * S * 0.9; desc = F * S * 0.25; }
      cv.width = Math.ceil(m.width) + pad * 2; cv.height = Math.ceil(F * S * 2.4);
      var y0 = Math.ceil(F * S * 1.6);
      ctx.font = font; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#000";
      ctx.fillText("?", pad, y0);
      var W = cv.width, H = cv.height, px = ctx.getImageData(0, 0, W, H).data;
      function rowHasInk(y){ for(var x = 0; x < W; x++){ if(px[(y * W + x) * 4 + 3] > 96) return true; } return false; }
      var y = H - 1;
      while(y >= 0 && !rowHasInk(y)) y--;
      var dotBottom = y;
      while(y >= 0 && rowHasInk(y)) y--;
      var dotTop = y + 1;
      while(y >= 0 && !rowHasInk(y)) y--;
      var hookBottom = y;                              // last row of the hook, above the gap
      var minX = W, maxX = -1;
      for(var yy = dotTop; yy <= dotBottom; yy++){
        for(var x = 0; x < W; x++){
          if(px[(yy * W + x) * 4 + 3] > 96){ if(x < minX) minX = x; if(x > maxX) maxX = x; }
        }
      }
      if(dotBottom < 0 || maxX < 0 || hookBottom < 0) return;
      var dotD  = Math.max(maxX - minX + 1, dotBottom - dotTop + 1) / S;
      var dotCX = ((minX + maxX + 1) / 2 - pad) / S;           // from the glyph's left edge
      var dotCY = ((dotTop + dotBottom + 1) / 2 - y0) / S;     // from the baseline, down = positive
      var cutY  = (((dotTop + hookBottom + 1) / 2) - y0) / S;  // middle of the gap, from the baseline
      // Same measurements in the page: baseline inside the glyph's line box, glyph inside the 48px box.
      var B    = (gH - (asc + desc) / S) / 2 + asc / S;
      var left = boxW - gap - w, top = (boxH - gH) / 2;
      var bulletD = parseFloat(getComputedStyle(dotEl, "::before").width) || 1;
      wrap.style.setProperty("--dot-dx", (left + dotCX - boxW / 2) + "px");
      wrap.style.setProperty("--dot-dy", (top + B + dotCY - boxH / 2) + "px");
      wrap.style.setProperty("--dot-s", String(dotD / bulletD));
      var cutPx = B + cutY;                                    // from the top of the glyph box
      if(cutPx > 0 && cutPx < gH) qGlyph.style.clipPath = "inset(0 0 " + (gH - cutPx) + "px 0)";
    }catch(err){ /* no canvas: the bullet just shrinks in place and the "?" keeps its own dot */ }
  }
  measure();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener("resize", measure);

  var helpState = "closed";                // closed -> opening -> open -> closing -> closed
  var want = false;                        // what the pointer/tap currently asks for

  // Runs whenever a transition ends, so a hover that came and went mid-animation is honoured afterwards.
  function settle(){
    if(helpState === "closed" && want) runOpen();
    else if(helpState === "open" && !want && !shown) runClose();
  }
  function openHelp(){ want = true; settle(); }
  function closeHelp(){ want = false; settle(); }

  function runOpen(){
    helpState = "opening";
    mark.setAttribute("aria-expanded", "true");
    wrap.classList.add("shrunk");                      // the bullet shrinks into the dot of the "?"
    setTimeout(function(){
      wrap.classList.add("q-in");                      // the rest of the "?" appears above it
      setTimeout(function(){
        bubble.classList.add("open");
        typeLabel(false, function(){                   // and the label is typed out leftwards from it
          helpState = "open";
          settle();
        });
      }, Q_MS);
    }, DOT_MS);
  }
  function runClose(){
    helpState = "closing";
    mark.setAttribute("aria-expanded", "false");
    typeLabel(true, function(){                        // the label is backspaced into the "?"
      bubble.classList.remove("open");
      wrap.classList.remove("q-in");                   // the hook of the "?" goes...
      setTimeout(function(){
        wrap.classList.remove("shrunk");               // ...and the dot grows back into the bullet
        setTimeout(function(){
          helpState = "closed";
          settle();
        }, DOT_MS);
      }, Q_MS);
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
    skipFocusOpen = true; mark.focus(); skipFocusOpen = false;
  }

  // Touch devices (no hover, no Escape key): the bullet opens on press and tapping outside closes it.
  // Everywhere else the bullet opens on hover. Checked at event time so it follows the device.
  var touchQuery = window.matchMedia ? window.matchMedia("(hover: none) and (pointer: coarse)") : null;
  function isTouch(){ return !!(touchQuery && touchQuery.matches); }

  var leaveTimer = null, skipFocusOpen = false;
  wrap.addEventListener("mouseenter", function(){
    if(isTouch()) return;
    clearTimeout(leaveTimer);
    openHelp();
  });
  wrap.addEventListener("mouseleave", function(){
    if(isTouch()) return;
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(function(){ if(!shown) closeHelp(); }, 150);   // not while the description is up
  });
  // Keyboard users: tabbing to the bullet opens it, tabbing away closes it.
  wrap.addEventListener("focusin", function(){
    if(isTouch() || skipFocusOpen) return;
    if(mark.matches && mark.matches(":focus-visible")) openHelp();
  });
  wrap.addEventListener("focusout", function(e){
    if(isTouch() || wrap.contains(e.relatedTarget)) return;
    if(!shown) closeHelp();
  });

  mark.addEventListener("click", function(){
    if(shown){ dismiss(); return; }
    if(helpState === "open" || helpState === "opening") startTyping();   // clickable mid-animation; the "?" is part of the label: same as clicking the words
    else openHelp();                                    // press on touch devices (or a click that beat the hover)
  });
  bubble.addEventListener("click", function(){
    if((helpState === "open" || helpState === "opening") && !shown) startTyping();   // the label stays put while the text is typed
  });
  document.addEventListener("click", function(e){
    if(!isTouch()) return;
    if(!shown && !wrap.contains(e.target)) closeHelp();
  });
  document.addEventListener("keydown", function(e){
    if(e.key !== "Escape") return;
    if(shown){ dismiss(); }
    else closeHelp();
  });
})();
