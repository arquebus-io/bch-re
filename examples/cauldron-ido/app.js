/* ============================================================
   Cauldron IDO Creation Flow — prototype state & view
   ------------------------------------------------------------
   Single state object drives every visible value.
   No framework — direct DOM updates, debounced for inputs.
   Field-level mini-arc states: dimmed → active → focused → resolved.
   ============================================================ */

(() => {

  /* --------------------------- state --------------------------- */

  const FIELD_ORDER = [
    'name', 'ticker', 'decimals', 'supply',
    'identity',
    'raise', 'salePct', 'duration', 'permLiq', 'timeLock'
  ];

  // Fields that gate progression (skip optional identity).
  const REQUIRED_ORDER = FIELD_ORDER.filter(f => f !== 'identity');

  const PLATFORM_FEE_PCT = 5; // displayed everywhere; the spec uses [X]% as a placeholder

  const EXAMPLE = {
    name: 'EXAMPLE',
    ticker: 'EXMPL',
    decimals: 2,
    supply: 1_000_000,
    raiseGoal: 14.28,
    salePct: 70,
    durationDays: 30,
    permLiqShare: 20,
    timeLockDiscount: 17,
  };

  const state = {
    phase: 'authoring',
    isExample: true,
    name: '',
    ticker: '',
    decimals: 2,
    supply: '',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
    raiseGoal: 10,
    salePct: 50,
    durationDays: 30,
    permLiqShare: 20,
    timeLockDiscount: 17,
    bchUsd: 412.00, // example exchange rate (would come from oracle in real impl)
  };

  /* --------------------------- helpers --------------------------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmtNumber = (n, opts = {}) => {
    if (n === '' || n === null || n === undefined || Number.isNaN(n)) return '—';
    const { maxFrac = 2, minFrac = 0 } = opts;
    return Number(n).toLocaleString(undefined, {
      maximumFractionDigits: maxFrac,
      minimumFractionDigits: minFrac
    });
  };

  const fmtBch = (n, frac = 4) => `${fmtNumber(n, { maxFrac: frac })} BCH`;
  const fmtUsd = (n) => `$${fmtNumber(n, { maxFrac: 0 })}`;

  // Scientific notation for very small numbers ("2.4×10⁻⁷ BCH").
  const fmtSciSmall = (n) => {
    if (!isFinite(n) || n === 0) return '—';
    if (n >= 0.0001) return n.toFixed(6).replace(/0+$/, '');
    const exp = Math.floor(Math.log10(n));
    const mant = (n / Math.pow(10, exp)).toFixed(3);
    const sup = String(exp).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'[c === '-' ? 10 : Number(c)]).join('');
    return `${mant}×10${sup}`;
  };

  const fmtDate = (date) => {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const seasonOf = (date) => {
    const m = date.getMonth();
    if (m <= 1 || m === 11) return 'winter';
    if (m <= 4) return 'spring';
    if (m <= 7) return 'summer';
    return 'autumn';
  };

  /* --------------------------- effective values --------------------------- */
  // The user's own state (resolved sentences, mentor panels, computations).
  const fromState = () => ({
    name: state.name || '—',
    ticker: (state.ticker || '').toUpperCase() || '—',
    decimals: Number(state.decimals) || 0,
    supply: Number(state.supply) || 0,
    raiseGoal: Number(state.raiseGoal) || 0,
    salePct: Number(state.salePct) || 0,
    durationDays: Number(state.durationDays) || 30,
    permLiqShare: Number(state.permLiqShare) || 0,
    timeLockDiscount: Number(state.timeLockDiscount) || 0,
    feePct: PLATFORM_FEE_PCT,
  });

  // The right rail shows EXAMPLE values until the user engages.
  const fromRail = () => state.isExample
    ? { ...EXAMPLE, feePct: PLATFORM_FEE_PCT }
    : fromState();

  /* --------------------------- derived values --------------------------- */

  const computeDerived = (e) => {
    const tokensForSale = e.supply * (e.salePct / 100);
    const tokensKept = e.supply - tokensForSale;
    // Implied price per token in BCH (raise goal ÷ tokens for sale).
    const pricePerToken = tokensForSale > 0 ? e.raiseGoal / tokensForSale : 0;
    const feeBch = e.raiseGoal * (e.feePct / 100);
    const permLiqBch = e.raiseGoal * (e.permLiqShare / 100);
    const youReceiveBch = e.raiseGoal - feeBch - permLiqBch;
    // Wallet requirement: tokens for sale, scaled to 10^decimals (a stand-in).
    const walletReq = tokensForSale * Math.pow(10, e.decimals);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + e.durationDays);
    const usdEquiv = e.raiseGoal * state.bchUsd;

    // Buyer A locks 30 days, Buyer B locks 365 days.
    // Effective price = price × (1 − discountRate × lockDays/365).
    const dr = e.timeLockDiscount / 100;
    const buyerA = pricePerToken * (1 - dr * (30 / 365));
    const buyerB = pricePerToken * (1 - dr * (365 / 365));
    // Permanent liquidity portion of a 1-BCH buy.
    const permLiqPerBch = e.permLiqShare / 100;
    const feeBreakeven = e.feePct + 1; // anchor sub line

    return {
      ...e,
      tokensForSale, tokensKept, pricePerToken,
      feeBch, permLiqBch, youReceiveBch, walletReq,
      startDate, endDate, usdEquiv,
      buyerA, buyerB,
      permLiqPerBch, feeBreakeven,
    };
  };

  // For the form, mentor panels, resolved sentences, reflection, fee, return.
  const derive = () => computeDerived(fromState());
  // For the right rail only (shows EXAMPLE before user engages).
  const deriveRail = () => computeDerived(fromRail());

  /* --------------------------- field gating --------------------------- */

  // A field is "active" once all earlier required fields have a value.
  // The currently focused field gets data-status="focused".
  const fieldHasValue = (field) => {
    switch (field) {
      case 'name':      return state.name.trim().length > 0;
      case 'ticker':    return state.ticker.trim().length > 0;
      case 'decimals':  return state.decimals !== '' && state.decimals !== null;
      case 'supply':    return Number(state.supply) > 0;
      case 'identity':  return true; // always available, never gates
      case 'raise':     return Number(state.raiseGoal) > 0;
      case 'salePct':   return Number(state.salePct) > 0;
      case 'duration':  return Number(state.durationDays) > 0;
      case 'permLiq':   return state.permLiqShare !== '' && state.permLiqShare !== null;
      case 'timeLock':  return state.timeLockDiscount !== '' && state.timeLockDiscount !== null;
      default: return false;
    }
  };

  const updateFieldStatuses = () => {
    let unlock = true;
    for (const f of FIELD_ORDER) {
      const el = $(`.field[data-field="${f}"]`);
      if (!el) continue;
      if (f === 'identity') {
        el.setAttribute('data-status', 'active');
        continue;
      }
      if (unlock) {
        // Was the field focused? Preserve that.
        if (el.getAttribute('data-status') !== 'focused') {
          el.setAttribute('data-status', fieldHasValue(f) ? 'resolved' : 'active');
        }
        el.removeAttribute('inert');
      } else {
        el.removeAttribute('data-status');
        el.setAttribute('inert', '');
      }
      // Once we reach an unresolved required field, downstream stays dimmed.
      if (REQUIRED_ORDER.includes(f) && !fieldHasValue(f)) {
        unlock = false;
      }
    }
  };

  /* --------------------------- rendering --------------------------- */

  const setText = (sel, value) => {
    $$(sel).forEach(el => { el.textContent = value; });
  };

  const renderRail = () => {
    const d = deriveRail();
    const right = $('.right');
    right.setAttribute('data-state', state.isExample ? 'example' : 'user');

    // token card + ticker bindings
    $$('[data-bind="name"]').forEach(el => el.textContent = d.name);
    $$('[data-bind="ticker"]').forEach(el => el.textContent = d.ticker);
    $$('[data-bind="ticker-upper"]').forEach(el => el.textContent = (d.ticker || 'TOKEN').toUpperCase());

    // donut slices via stroke-dasharray
    const R = 80;
    const C = 2 * Math.PI * R;
    const total = d.raiseGoal > 0 ? 1 : 0;
    const publicFrac = total ? Math.max(0, (d.youReceiveBch / d.raiseGoal)) : 0;
    const permFrac   = total ? d.permLiqShare / 100 : 0;
    const feeFrac    = total ? d.feePct / 100 : 0;

    const setSlice = (cls, frac, offset) => {
      const el = $(`.slice.${cls}`);
      if (!el) return;
      const len = Math.max(0, Math.min(1, frac)) * C;
      el.setAttribute('stroke-dasharray', `${len} ${C}`);
      el.setAttribute('stroke-dashoffset', `${-offset * C}`);
    };
    setSlice('slice-public', publicFrac, 0);
    setSlice('slice-perm',   permFrac,   publicFrac);
    setSlice('slice-fee',    feeFrac,    publicFrac + permFrac);

    // legend
    setText('[data-derive="legendPublic"]', `${fmtBch(d.youReceiveBch, 3)} (${Math.round(publicFrac*100)}%)`);
    setText('[data-derive="legendPerm"]',   `${fmtBch(d.permLiqBch, 3)} (${Math.round(permFrac*100)}%)`);
    setText('[data-derive="legendFee"]',    `${fmtBch(d.feeBch, 3)} (${Math.round(feeFrac*100)}%)`);

    // rail numbers
    setText('[data-derive="rail-raise"]', fmtBch(d.raiseGoal, 4));
    setText('[data-derive="rail-price"]', fmtSciSmall(d.pricePerToken));
    setText('[data-derive="rail-wallet"]', fmtNumber(d.walletReq, { maxFrac: 0 }));
    setText('[data-derive="rail-end"]',   fmtDate(d.endDate));

    // rail timeline (always full bar; show endDate label)
    $$('[data-derive="rail-tl-fill"]').forEach(el => el.style.width = '100%');
    setText('[data-derive="rail-tl-end"]', fmtDate(d.endDate));
  };

  const renderMentorPanels = () => {
    const d = derive();

    // decimals: highlight active row
    $$('.mentor[data-mentor="decimals"] .mentor-row').forEach(row => {
      row.classList.toggle('is-active', Number(row.dataset.d) === Number(state.decimals));
    });

    // raise USD
    setText('[data-derive="raise-usd"]',
      `≈ ${fmtUsd(d.usdEquiv)} at today's rate (1 BCH ≈ ${fmtUsd(state.bchUsd)})`);

    // sale percent breakdown
    setText('[data-derive="willSell"]',     `${fmtNumber(d.tokensForSale, { maxFrac: 0 })} ${d.ticker}`);
    setText('[data-derive="willKeep"]',     `${fmtNumber(d.tokensKept, { maxFrac: 0 })} ${d.ticker}`);
    setText('[data-derive="willReceive"]',  `${fmtBch(d.youReceiveBch, 4)} (after fee + liquidity)`);

    // duration timeline + phrase
    const durFracMentor = Math.min(1, state.durationDays / 365);
    $$('.mentor-timeline .tl-fill').forEach(el => el.style.width = `${durFracMentor * 100}%`);
    setText('[data-derive="endDate"]', fmtDate(d.endDate));
    setText('[data-derive="durationPhrase"]',
      `Ends in ${seasonOf(d.endDate)} ${d.endDate.getFullYear()} — ${state.durationDays} days from today.`);

    // permLiq diagram
    setText('[data-derive="permLiqPct"]', `${state.permLiqShare}%`);
    setText('[data-derive="permLiqPerBchBch"]', `${fmtBch(d.permLiqPerBch, 3)}`);

    // timeLock buyers
    setText('[data-derive="buyerA"]', `${fmtSciSmall(d.buyerA)} BCH per ${d.ticker}`);
    setText('[data-derive="buyerB"]', `${fmtSciSmall(d.buyerB)} BCH per ${d.ticker}`);

    // ticker placeholders inside fields
    $$('.q .tk').forEach(el => el.textContent = `[${d.ticker}]`);
    $$('.diagram .tk').forEach(el => el.textContent = `[${d.ticker}]`);
  };

  const renderResolved = () => {
    const d = derive();

    const sentences = {
      name:      `Named: <strong>${escapeHtml(d.name)}</strong>`,
      ticker:    `Ticker: <strong>${escapeHtml(d.ticker)}</strong>`,
      decimals:  `Each ${d.ticker} can be split into ${fmtNumber(Math.pow(10, d.decimals), { maxFrac: 0 })} pieces.`,
      supply:    `<strong>${fmtNumber(d.supply, { maxFrac: 0 })}</strong> ${d.ticker} will ever exist.`,
      raise:     `Targeting <strong>${fmtBch(d.raiseGoal, 4)}</strong> (≈ ${fmtUsd(d.usdEquiv)} at today's rate).`,
      salePct:   `Selling <strong>${d.salePct}%</strong> to the public; keeping <strong>${100 - d.salePct}%</strong> for yourself.`,
      duration:  `Your IDO runs for <strong>${d.durationDays} days</strong>, ending ${fmtDate(d.endDate)}.`,
      permLiq:   `<strong>${d.permLiqShare}%</strong> of every purchase becomes permanent, tradeable liquidity.`,
      timeLock:  `Year-long lockers get ${d.ticker} <strong>${d.timeLockDiscount}%</strong> cheaper than 30-day lockers.`,
    };

    for (const [field, html] of Object.entries(sentences)) {
      const el = $(`.field[data-field="${field}"] .resolved`);
      if (!el) continue;
      const has = fieldHasValue(field);
      const isFocused = $(`.field[data-field="${field}"]`)?.getAttribute('data-status') === 'focused';
      el.hidden = !has || isFocused;
      if (has && !isFocused) {
        el.innerHTML = `<span><span class="check">✓</span> ${html}</span>` +
          `<button type="button" class="edit-btn" data-edit="${field}">Edit</button>`;
      }
    }
  };

  const renderFriction = () => {
    const tickerLong = state.ticker.length > 6;
    toggleFriction('ticker-long', tickerLong);

    const durLong = state.durationDays >= 270;
    toggleFriction('duration-long', durLong);

    const permLow = state.permLiqShare < 10;
    toggleFriction('permliq-low', permLow);

    const tlZero = Number(state.timeLockDiscount) === 0;
    toggleFriction('timelock-zero', tlZero);
  };

  const toggleFriction = (key, show) => {
    const el = $(`[data-friction="${key}"]`);
    if (el) el.hidden = !show;
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  /* --------------------------- master render --------------------------- */

  const render = () => {
    updateFieldStatuses();
    renderRail();
    renderMentorPanels();
    renderResolved();
    renderFriction();

    // Phase visibility
    $$('.phase').forEach(p => {
      p.hidden = p.dataset.phase !== state.phase;
    });

    if (state.phase === 'reflection') renderReflection();
    if (state.phase === 'fee')        renderFee();
    if (state.phase === 'launch')     renderLaunchView();
    if (state.phase === 'return')     renderReturn();
  };

  /* --------------------------- reflection paragraph --------------------------- */

  const renderReflection = () => {
    const d = derive();
    const tk = d.ticker;
    // Each <button class="editable" data-jump="<field>"> jumps back to that field.
    const html = `
      You're launching
      <button class="editable" data-jump="name">${escapeHtml(d.name)}</button>
      (<button class="editable" data-jump="ticker">${escapeHtml(d.ticker)}</button>),
      a token with a total supply of
      <button class="editable" data-jump="supply">${fmtNumber(d.supply, { maxFrac: 0 })} ${tk}</button>.
      You'll offer
      <button class="editable" data-jump="salePct">${d.salePct}% to the public</button>
      over
      <button class="editable" data-jump="duration">${d.durationDays} days</button>,
      targeting a raise of
      <button class="editable" data-jump="raise">${fmtBch(d.raiseGoal, 4)}</button>.
      Of every purchase,
      <button class="editable" data-jump="permLiq">${d.permLiqShare}% becomes permanent liquidity</button>,
      and buyers who lock their tokens get up to
      <button class="editable" data-jump="timeLock">${d.timeLockDiscount}% off annually</button>.
      If your IDO sells out, you'll receive <strong>${fmtBch(d.youReceiveBch, 3)}</strong>
      and retain <strong>${100 - d.salePct}%</strong> of supply.
    `;
    $('#reflection-paragraph').innerHTML = html;
  };

  /* --------------------------- fee value screen --------------------------- */

  const renderFee = () => {
    const d = derive();
    setText('[data-derive="feePct"]', `${d.feePct}%`);
    setText('[data-derive="feeBch"]', fmtBch(d.feeBch, 4));
    setText('[data-derive="feeBreakeven"]', `${d.feeBreakeven}%`);
    setText('[data-derive="permLiqPct"]', `${d.permLiqShare}%`);
  };

  /* --------------------------- launch view --------------------------- */

  const renderLaunchView = () => {
    const d = derive();
    $('#launch-paragraph').innerHTML = `
      Launching <strong>${escapeHtml(d.name)} (${escapeHtml(d.ticker)})</strong>.
      Targeting ${fmtBch(d.raiseGoal, 4)} over ${d.durationDays} days.
      Platform fee ${d.feePct}% (~${fmtBch(d.feeBch, 3)}). Permanent liquidity ${d.permLiqShare}%.
    `;
  };

  /* --------------------------- return view --------------------------- */

  const renderReturn = () => {
    const d = derive();
    const tweet = `Just launched ${d.ticker} on @Cauldron! ${d.salePct}% to public, ${d.durationDays}-day window, ${d.timeLockDiscount}% time-lock discount for early lockers. https://cauldron.example/${d.ticker.toLowerCase()}`;
    $('#share-copy').value = tweet;
    $('#share-twitter').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    $('#share-link').href = `https://cauldron.example/${d.ticker.toLowerCase()}`;

    $('#recap-body').innerHTML = `
      Your token <strong>${escapeHtml(d.ticker)}</strong> is now live and accepting buyers for the next
      <strong>${d.durationDays} days</strong>, ending ${fmtDate(d.endDate)}.
      Every BCH that comes in is split three ways:
      <strong>${d.permLiqShare}%</strong> goes into a permanent liquidity pool that future buyers can trade against,
      <strong>${d.feePct}%</strong> goes to Cauldron, and the rest (<strong>${100 - d.permLiqShare - d.feePct}%</strong>) goes to you.
      Buyers who lock their ${d.ticker} for longer get a discount of up to ${d.timeLockDiscount}% per year.
      If the raise goal isn't met by the end date, every buyer is automatically refunded and you don't owe a fee.
    `;
  };

  /* --------------------------- input wiring --------------------------- */

  const debounce = (fn, ms = 50) => {
    let t = null;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  const onUserEngaged = () => {
    if (state.isExample) {
      state.isExample = false;
    }
  };

  const wireInputs = () => {
    const bind = (id, key, transform = v => v) => {
      const el = $(`#${id}`);
      if (!el) return;
      const handler = debounce(() => {
        state[key] = transform(el.value);
        onUserEngaged();
        render();
        // update slider value labels live
        renderSliderLabels();
      });
      el.addEventListener('input', handler);
    };

    bind('f-name', 'name');
    bind('f-ticker', 'ticker', v => v.toUpperCase());
    bind('f-decimals', 'decimals', v => v === '' ? '' : Number(v));
    bind('f-supply', 'supply', v => v === '' ? '' : Number(v));
    bind('f-desc', 'description');
    bind('f-website', 'website');
    bind('f-twitter', 'twitter');
    bind('f-telegram', 'telegram');
    bind('f-raise', 'raiseGoal', v => Number(v));
    bind('f-sale', 'salePct', v => Number(v));
    bind('f-duration', 'durationDays', v => Number(v));
    bind('f-permliq', 'permLiqShare', v => Number(v));
    bind('f-timelock', 'timeLockDiscount', v => Number(v));

    // Force ticker to uppercase as the user types (keep caret)
    $('#f-ticker').addEventListener('input', e => {
      const start = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(start, start);
    });

    // Benchmark buttons (raise goal)
    $$('.benchmark').forEach(b => {
      b.addEventListener('click', () => {
        const v = Number(b.dataset.raise);
        $('#f-raise').value = v;
        state.raiseGoal = v;
        onUserEngaged();
        render();
      });
    });

    // Edit buttons inside resolved sentences (delegated)
    document.addEventListener('click', e => {
      const editBtn = e.target.closest('[data-edit]');
      if (editBtn) {
        const field = editBtn.dataset.edit;
        focusField(field);
      }
      const jump = e.target.closest('[data-jump]');
      if (jump) {
        const field = jump.dataset.jump;
        state.phase = 'authoring';
        render();
        focusField(field);
      }
    });

    // Field focus → status="focused", and pulse the relevant donut slice
    $$('.field input, .field textarea, .field .slider').forEach(input => {
      input.addEventListener('focus', () => {
        const field = input.closest('.field')?.dataset.field;
        if (!field) return;
        $$('.field').forEach(f => {
          if (f.getAttribute('data-status') === 'focused') {
            f.setAttribute('data-status', fieldHasValue(f.dataset.field) ? 'resolved' : 'active');
          }
        });
        const f = $(`.field[data-field="${field}"]`);
        if (f) f.setAttribute('data-status', 'focused');
        pulseSlice(field);
        render();
      });
      input.addEventListener('blur', () => {
        const field = input.closest('.field')?.dataset.field;
        if (!field) return;
        const f = $(`.field[data-field="${field}"]`);
        if (f) f.setAttribute('data-status', fieldHasValue(field) ? 'resolved' : 'active');
        pulseSlice(null);
        render();
      });
    });
  };

  const renderSliderLabels = () => {
    $('output[data-bind="salePct"]').textContent = `${state.salePct}%`;
    $('output[data-bind="duration"]').textContent = `${state.durationDays} days`;
    $('output[data-bind="permLiq"]').textContent = `${state.permLiqShare}%`;
    $('output[data-bind="timeLock"]').textContent = `${state.timeLockDiscount}%`;
  };

  /* --------------------------- focus helper --------------------------- */

  const FIELD_TO_INPUT = {
    name: '#f-name',
    ticker: '#f-ticker',
    decimals: '#f-decimals',
    supply: '#f-supply',
    raise: '#f-raise',
    salePct: '#f-sale',
    duration: '#f-duration',
    permLiq: '#f-permliq',
    timeLock: '#f-timelock',
  };

  const focusField = (field) => {
    const sel = FIELD_TO_INPUT[field];
    if (!sel) return;
    const el = $(sel);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.focus(), 200);
  };

  /* --------------------------- donut pulse --------------------------- */

  const FIELD_TO_SLICE = {
    salePct: 'slice-public',
    raise: 'slice-public',
    permLiq: 'slice-perm',
    timeLock: 'slice-perm',
  };
  const pulseSlice = (field) => {
    $$('.slice').forEach(s => s.classList.remove('is-pulse'));
    if (!field) return;
    const cls = FIELD_TO_SLICE[field];
    if (cls) $(`.slice.${cls}`)?.classList.add('is-pulse');
  };

  /* --------------------------- phase transitions --------------------------- */

  const wirePhases = () => {
    $('#to-reflection').addEventListener('click', () => {
      // basic guard: require name + ticker + supply + raiseGoal
      if (!state.name || !state.ticker || Number(state.supply) <= 0) {
        // soft nudge: scroll to first unfilled
        for (const f of REQUIRED_ORDER) {
          if (!fieldHasValue(f)) { focusField(f); break; }
        }
        return;
      }
      state.phase = 'reflection';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      render();
    });

    $('#back-to-authoring').addEventListener('click', () => {
      state.phase = 'authoring';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      render();
    });

    $('#to-fee').addEventListener('click', () => {
      state.phase = 'fee';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      render();
    });

    $('#to-launch').addEventListener('click', () => {
      state.phase = 'launch';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      render();
    });

    $('#launch-btn').addEventListener('click', () => {
      const btn = $('#launch-btn');
      const status = $('#launch-status');
      btn.disabled = true;
      status.hidden = false;
      status.textContent = 'Waiting for your signature…';
      setTimeout(() => {
        status.textContent = 'Broadcasting your launch…';
      }, 1100);
      setTimeout(() => {
        state.phase = 'return';
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 2400);
    });

    $('#copy-share').addEventListener('click', async () => {
      const ta = $('#share-copy');
      ta.select();
      try {
        await navigator.clipboard.writeText(ta.value);
        $('#copy-share').textContent = 'Copied';
        setTimeout(() => $('#copy-share').textContent = 'Copy', 1400);
      } catch {
        // selection fallback
      }
    });
  };

  /* --------------------------- init --------------------------- */

  const init = () => {
    wireInputs();
    wirePhases();
    renderSliderLabels();
    render();
    // Focus the first field for immediate engagement.
    setTimeout(() => $('#f-name')?.focus(), 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
