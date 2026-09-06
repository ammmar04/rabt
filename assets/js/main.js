/* Rabt — one vanilla script, no dependencies.
   Catalogue + filters, single-item borrow flow, dashboard, admin shell.

   BACKEND SEAM: everything that would eventually talk to a server goes
   through store.saveRequest() / store.allRequests(). Point ENDPOINT at a
   Google Apps Script web app and requests POST there as well as saving
   locally — no other code has to change. */
(() => {
  "use strict";

  const ENDPOINT = "";                    // e.g. "https://script.google.com/macros/s/…/exec"
  const REQ_KEY = "rabt_requests_v1";
  const OVR_KEY = "rabt_overrides_v1";    // admin availability overrides (MVP only)

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const qs = (k) => new URLSearchParams(location.search).get(k);

  let DATA = null;
  const ready = fetch("data/inventory.json").then((r) => r.json()).then((d) => (DATA = d));

  const cfg = () => DATA.config;
  const itemById = (id) => DATA.items.find((i) => i.id === id);
  const catBySlug = (s) => DATA.categories.find((c) => c.slug === s);

  /* ------------------------------------------------------------ storage */
  const store = {
    allRequests() {
      try { return JSON.parse(localStorage.getItem(REQ_KEY)) || []; } catch (e) { return []; }
    },
    saveRequest(req) {
      const all = store.allRequests();
      all.unshift(req);
      try { localStorage.setItem(REQ_KEY, JSON.stringify(all)); } catch (e) {}
      if (ENDPOINT) {
        fetch(ENDPOINT, {
          method: "POST", mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(req),
        }).catch(() => {});
      }
      return req;
    },
    update(ref, patch) {
      const all = store.allRequests();
      const hit = all.find((r) => r.ref === ref);
      if (hit) Object.assign(hit, patch);
      try { localStorage.setItem(REQ_KEY, JSON.stringify(all)); } catch (e) {}
    },
    overrides() {
      try { return JSON.parse(localStorage.getItem(OVR_KEY)) || {}; } catch (e) { return {}; }
    },
    setOverride(id, status) {
      const o = store.overrides();
      o[id] = status;
      try { localStorage.setItem(OVR_KEY, JSON.stringify(o)); } catch (e) {}
    },
  };

  /* effective status = inventory status unless admin overrode it locally */
  function statusOf(item) {
    const o = store.overrides();
    return o[item.id] || item.status;
  }

  /* ------------------------------------------------------------ dates */
  const fmtDay = (d) => d.toLocaleDateString("en-GB", { weekday: "short" });
  const fmtFull = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const iso = (d) => d.toISOString().slice(0, 10);
  function niceDate(s) {
    const d = new Date(s + "T00:00:00");
    return isNaN(d) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  function nextDays(n) {
    const out = [], closed = cfg().closedDays || [];
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
    while (out.length < n) {
      out.push({ date: new Date(d), closed: closed.includes(d.getDay()) });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  /* ------------------------------------------------------------ bits */
  function badge(item) {
    const s = statusOf(item);
    if (s === "available") return '<span class="badge badge--available">Available</span>';
    if (s === "soon") return '<span class="badge badge--soon">From ' + niceDate(item.availableFrom) + "</span>";
    return '<span class="badge badge--borrowed">Currently borrowed</span>';
  }

  function itemCard(item, d) {
    const c = catBySlug(item.category);
    const s = statusOf(item);
    const out = s !== "available";
    return (
      '<article class="item reveal' + (out ? " item--out" : "") + '"' + (d ? ' data-d="' + d + '"' : "") + ">" +
        '<div class="item__media">' +
          '<span class="tag item__tag">' + item.id + "</span>" +
          '<span class="item__status">' + badge(item) + "</span>" +
          '<a href="item.html?id=' + item.id + '" aria-label="View ' + esc(item.name) + '">' +
            '<img src="assets/img/items/' + item.id + '.svg" alt="' + esc(item.name) + '" width="800" height="1000" loading="lazy" decoding="async">' +
          "</a>" +
          '<div class="item__cta"><a class="btn btn--sm btn--block" href="item.html?id=' + item.id + '">' +
            (out ? "View item" : "View / Borrow") + "</a></div>" +
        "</div>" +
        '<div class="item__body">' +
          '<a href="item.html?id=' + item.id + '"><h3 class="item__name">' + esc(item.name) + "</h3></a>" +
          '<div class="item__meta"><span>' + esc(c ? c.singular : item.type) + "</span><span>" + esc(item.colour) + "</span></div>" +
          '<div class="item__sizes">' + item.sizes.map((x) => "<span>" + x + "</span>").join("") + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    arrow: '<svg width="20" height="8" viewBox="0 0 20 8" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M0 4h18M15 1l3 3-3 3"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  };

  /* ------------------------------------------------------------ home */
  function initHome() {
    const cg = $("#home-cats");
    if (cg) {
      cg.innerHTML = DATA.categories.map((c, i) => {
        const n = DATA.items.filter((x) => x.category === c.slug).length;
        return '<a class="cat reveal" data-d="' + ((i % 4) + 1) + '" href="catalogue.html?category=' + c.slug + '">' +
          '<div class="cat__media"><img src="' + c.image + '" alt="' + esc(c.name) + '" width="1200" height="800" loading="lazy"></div>' +
          '<div class="cat__body"><span class="cat__name">' + esc(c.name) + "</span>" +
          '<span class="cat__count">' + n + " item" + (n === 1 ? "" : "s") + "</span></div></a>";
      }).join("");
    }
    const fg = $("#home-items");
    if (fg) {
      const avail = DATA.items.filter((i) => statusOf(i) === "available").slice(0, 8);
      fg.innerHTML = avail.map((i, n) => itemCard(i, (n % 4) + 1)).join("");
    }
    const av = $("#stat-available");
    if (av) av.textContent = DATA.items.filter((i) => statusOf(i) === "available").length;
    const tot = $("#stat-total");
    if (tot) tot.textContent = DATA.items.length;
  }

  /* ------------------------------------------------------------ catalogue */
  function initCatalogue() {
    const grid = $("#cat-grid");
    if (!grid) return;
    const state = { category: [], size: [], colour: [], avail: [], q: "" };
    const pre = qs("category");
    if (pre && catBySlug(pre)) state.category.push(pre);

    const sizes = ["S", "M", "L", "XL"];
    const colours = [...new Set(DATA.items.map((i) => i.colour))];
    const colourHex = {};
    DATA.items.forEach((i) => { colourHex[i.colour] = i.colourHex; });

    $("#f-category").innerHTML = DATA.categories.map((c) =>
      '<button class="chip" role="switch" aria-pressed="false" data-k="category" data-v="' + c.slug + '">' + esc(c.name) + "</button>").join("");
    $("#f-size").innerHTML = sizes.map((s) =>
      '<button class="chip" role="switch" aria-pressed="false" data-k="size" data-v="' + s + '">' + s + "</button>").join("");
    $("#f-colour").innerHTML = colours.map((c) =>
      '<button class="chip" role="switch" aria-pressed="false" data-k="colour" data-v="' + esc(c) + '">' +
      '<span class="sw" style="background:' + colourHex[c] + '"></span>' + esc(c) + "</button>").join("");
    $("#f-avail").innerHTML = [["available", "Available now"], ["soon", "Available soon"], ["borrowed", "Currently borrowed"]]
      .map(([v, l]) => '<button class="chip" role="switch" aria-pressed="false" data-k="avail" data-v="' + v + '">' + l + "</button>").join("");

    function match(i) {
      if (state.category.length && !state.category.includes(i.category)) return false;
      if (state.size.length && !i.sizes.some((s) => state.size.includes(s))) return false;
      if (state.colour.length && !state.colour.includes(i.colour)) return false;
      if (state.avail.length && !state.avail.includes(statusOf(i))) return false;
      if (state.q) {
        const hay = (i.name + " " + i.type + " " + i.colour + " " + i.id + " " + i.description).toLowerCase();
        if (!hay.includes(state.q)) return false;
      }
      return true;
    }
    function render() {
      const list = DATA.items.filter(match);
      $("#cat-count").textContent = list.length + " item" + (list.length === 1 ? "" : "s");
      grid.innerHTML = list.length
        ? list.map((i, n) => itemCard(i, (n % 4) + 1)).join("")
        : '<div class="empty"><p>Nothing matches those filters just yet.</p></div>';
      reveal();
    }
    $$("[data-k]").forEach((ch) => {
      if (ch.dataset.k === "category" && state.category.includes(ch.dataset.v)) ch.setAttribute("aria-pressed", "true");
      ch.addEventListener("click", () => {
        const arr = state[ch.dataset.k], v = ch.dataset.v;
        const on = ch.getAttribute("aria-pressed") === "true";
        if (on) arr.splice(arr.indexOf(v), 1); else arr.push(v);
        ch.setAttribute("aria-pressed", String(!on));
        render();
      });
    });
    const sInput = $("#cat-search");
    if (sInput) sInput.addEventListener("input", () => { state.q = sInput.value.trim().toLowerCase(); render(); });
    $("#cat-reset").addEventListener("click", () => {
      state.category = []; state.size = []; state.colour = []; state.avail = []; state.q = "";
      if (sInput) sInput.value = "";
      $$("[data-k]").forEach((c) => c.setAttribute("aria-pressed", "false"));
      render();
    });
    render();
  }

  /* ------------------------------------------------------------ item page */
  function initItem() {
    const root = $("#item-root");
    if (!root) return;
    const item = itemById(qs("id")) || DATA.items[0];
    const c = catBySlug(item.category);
    const s = statusOf(item);
    const out = s !== "available";
    document.title = item.name + " — Rabt";

    const specs = Object.entries(item.measurements)
      .map(([k, v]) => '<div><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + "</span></div>").join("");

    root.innerHTML =
      '<nav class="crumb"><a href="catalogue.html">Catalogue</a> / <a href="catalogue.html?category=' + item.category + '">' + esc(c.name) + "</a> / <span>" + esc(item.name) + "</span></nav>" +
      '<div class="pdp">' +
        '<div class="pdp__gallery reveal">' +
          '<div class="pdp__main"><img id="pdp-img" src="assets/img/items/' + item.id + '.svg" alt="' + esc(item.name) + '" width="800" height="1000"></div>' +
          '<div class="pdp__thumbs" id="pdp-thumbs"></div>' +
        "</div>" +
        '<div class="pdp__info reveal" data-d="1">' +
          '<div class="pdp__head"><span class="tag">' + item.id + "</span>" + badge(item) + "</div>" +
          "<h1>" + esc(item.name) + "</h1>" +
          '<p class="lead">' + esc(item.description) + "</p>" +
          '<div class="pdp__block" style="margin-top:1.4rem">' +
            '<div class="pdp__blockhead"><span class="label">Size</span>' +
              '<button class="helper" id="size-help" type="button">Not sure about your size?</button></div>' +
            '<div class="sizes" id="sizes"></div>' +
            '<div class="note hidden" id="size-note" style="margin-top:0.9rem">Measure a shirt or jacket you already own flat across the chest, double it, and match it to the chest measurement below. If you are between sizes, the larger one is usually the safer borrow — or just ask us when we confirm your request.</div>' +
          "</div>" +
          '<div class="pdp__block">' +
            '<div class="pdp__blockhead"><span class="label">Details</span></div>' +
            '<div class="spec">' +
              '<div><span class="k">Type</span><span class="v">' + esc(item.type) + "</span></div>" +
              '<div><span class="k">Colour</span><span class="v">' + esc(item.colour) + "</span></div>" +
              '<div><span class="k">Fit</span><span class="v">' + esc(item.fit) + "</span></div>" +
              '<div><span class="k">Condition</span><span class="v">' + esc(item.condition) + "</span></div>" +
              specs +
            "</div>" +
          "</div>" +
          '<div class="pdp__block">' +
            '<div class="pdp__blockhead"><span class="label">Care</span></div>' +
            '<p class="muted" style="font-size:var(--fs-small)">' + esc(item.care) + "</p>" +
          "</div>" +
          '<div class="pdp__block">' +
            (out
              ? '<div class="note note--brass">This one is out at the moment' +
                (item.availableFrom ? ", expected back around <strong>" + niceDate(item.availableFrom) + "</strong>" : "") +
                '. Have a look at what else is on the rail — or check back shortly.</div>' +
                '<a class="btn btn--ghost btn--block btn--lg" style="margin-top:1rem" href="catalogue.html?category=' + item.category + '">Browse other ' + esc(c.name.toLowerCase()) + "</a>"
              : '<a class="btn btn--primary btn--block btn--lg" id="borrow-btn" href="borrow.html?id=' + item.id + '">Borrow this</a>' +
                '<p class="muted" style="font-size:var(--fs-small);margin-top:0.8rem;text-align:center">Free to borrow. No eligibility check, no forms about why you need it.</p>') +
          "</div>" +
        "</div>" +
      "</div>" +
      relatedBlock(item);

    // gallery
    const gal = ["assets/img/items/" + item.id + ".svg", "assets/img/items/" + item.id + "-detail.svg"];
    $("#pdp-thumbs").innerHTML = gal.map((src, i) =>
      '<button class="pdp__thumb" data-src="' + src + '" aria-current="' + (i === 0) + '" aria-label="Image ' + (i + 1) + '">' +
      '<img src="' + src + '" alt="" width="200" height="250" loading="lazy"></button>').join("");
    $$("#pdp-thumbs .pdp__thumb").forEach((t) => t.addEventListener("click", () => {
      $("#pdp-img").src = t.dataset.src;
      $$("#pdp-thumbs .pdp__thumb").forEach((x) => x.setAttribute("aria-current", "false"));
      t.setAttribute("aria-current", "true");
    }));

    // sizes (selection carries into the borrow flow)
    let picked = "";
    $("#sizes").innerHTML = item.sizes.map((s2) =>
      '<button class="size" role="switch" aria-pressed="false" data-s="' + s2 + '"' + (out ? " disabled" : "") + ">" + s2 + "</button>").join("");
    $$("#sizes .size").forEach((b) => b.addEventListener("click", () => {
      picked = b.dataset.s;
      $$("#sizes .size").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      const bb = $("#borrow-btn");
      if (bb) bb.href = "borrow.html?id=" + item.id + "&size=" + picked;
    }));
    $("#size-help").addEventListener("click", () => $("#size-note").classList.toggle("hidden"));
    reveal();
  }

  function relatedBlock(item) {
    const rel = DATA.items.filter((x) => x.category === item.category && x.id !== item.id).slice(0, 4);
    if (!rel.length) return "";
    return '<section class="section--tight" style="margin-top:2rem">' +
      '<div class="label label--rule reveal" style="margin-bottom:1.4rem">More ' + esc(catBySlug(item.category).name.toLowerCase()) + "</div>" +
      '<div class="items items--4">' + rel.map((x, i) => itemCard(x, (i % 4) + 1)).join("") + "</div></section>";
  }

  /* ------------------------------------------------------------ borrow */
  function initBorrow() {
    const root = $("#borrow-root");
    if (!root) return;
    const item = itemById(qs("id"));
    if (!item || statusOf(item) !== "available") {
      root.innerHTML = '<div class="blank"><p>That item isn\'t available to borrow right now.</p>' +
        '<a class="btn btn--ghost" style="margin-top:1.2rem" href="catalogue.html">Back to the catalogue</a></div>';
      return;
    }
    document.title = "Borrow " + item.name + " — Rabt";
    const st = { size: qs("size") && item.sizes.includes(qs("size")) ? qs("size") : "", date: "", time: "", method: "", contact: "", amount: "" };
    const days = nextDays(7);

    const steps = ["Size", "When", "Contact", "Contribute"];
    $("#stepper").innerHTML = steps.map((t, i) =>
      '<div class="step" data-step="' + i + '"><span class="step__n">' + (i + 1) + '</span><span class="step__t">' + t + "</span>" +
      (i < steps.length - 1 ? '<span class="step__bar"></span>' : "") + "</div>").join("");

    $("#summary").innerHTML =
      '<img src="assets/img/items/' + item.id + '.svg" alt="">' +
      '<div><div class="summary__t">' + esc(item.name) + "</div>" +
      '<div class="summary__m" id="sum-meta">' + esc(item.type) + " &middot; " + esc(item.colour) + "</div></div>" +
      '<span class="tag" style="margin-left:auto">' + item.id + "</span>";

    // step 1 — size
    $("#p-size").innerHTML =
      '<h2>Which size do you need?</h2>' +
      '<p class="muted" style="margin-top:0.6rem">Listed sizes are the ones we currently have for this piece.</p>' +
      '<div class="sizes" id="b-sizes" style="margin-top:1.4rem"></div>' +
      '<button class="helper" id="b-size-help" type="button" style="margin-top:1.1rem">Not sure about your size?</button>' +
      '<div class="note hidden" id="b-size-note" style="margin-top:0.9rem">Lay a similar garment flat, measure across the chest, and double it. Between sizes? Take the larger one — or pick either and mention it when we confirm; swapping is easy.</div>';
    $("#b-sizes").innerHTML = item.sizes.map((s) =>
      '<button class="size" role="switch" aria-pressed="' + (s === st.size) + '" data-s="' + s + '">' + s + "</button>").join("");
    $$("#b-sizes .size").forEach((b) => b.addEventListener("click", () => {
      st.size = b.dataset.s;
      $$("#b-sizes .size").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      sync();
    }));
    $("#b-size-help").addEventListener("click", () => $("#b-size-note").classList.toggle("hidden"));

    // step 2 — date + time
    $("#p-when").innerHTML =
      "<h2>When suits you?</h2>" +
      '<p class="muted" style="margin-top:0.6rem">Pick a day this coming week and a time. We\'ll confirm the exact collection point when we message you.</p>' +
      '<div class="days" id="b-days" style="margin-top:1.4rem"></div>' +
      '<div class="label" style="margin:1.6rem 0 0.7rem">Time</div>' +
      '<div class="slots" id="b-slots"></div>' +
      '<div class="picked hidden" id="b-picked"></div>';
    $("#b-days").innerHTML = days.map((d) =>
      '<button class="day" role="switch" aria-pressed="false" data-d="' + iso(d.date) + '"' + (d.closed ? " disabled" : "") + ">" +
      '<span class="day__d">' + fmtDay(d.date) + '</span><span class="day__n">' + d.date.getDate() + "</span></button>").join("");
    $("#b-slots").innerHTML = cfg().slots.map((t) =>
      '<button class="slot" role="switch" aria-pressed="false" data-t="' + t + '">' + t + "</button>").join("");
    $$("#b-days .day").forEach((b) => b.addEventListener("click", () => {
      st.date = b.dataset.d;
      $$("#b-days .day").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      showPicked(); sync();
    }));
    $$("#b-slots .slot").forEach((b) => b.addEventListener("click", () => {
      st.time = b.dataset.t;
      $$("#b-slots .slot").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      showPicked(); sync();
    }));
    function showPicked() {
      const el = $("#b-picked");
      if (!st.date || !st.time) { el.classList.add("hidden"); return; }
      el.classList.remove("hidden");
      el.innerHTML = ICON.cal + "<span>" + fmtFull(new Date(st.date + "T00:00:00")) + " at " + st.time + "</span>";
    }

    // step 3 — contact
    $("#p-contact").innerHTML =
      "<h2>How should we reach you?</h2>" +
      '<p class="muted" style="margin-top:0.6rem">Just so we can confirm your request and share collection details. Nothing else — no ID, no forms.</p>' +
      '<div style="margin-top:1.6rem">' +
        '<div class="field"><label for="c-method">Preferred contact</label>' +
          '<select class="select" id="c-method"><option value="">Choose one</option>' +
            '<option value="WhatsApp">WhatsApp</option><option value="Email">Email</option>' +
            '<option value="Secondary account">A secondary / spare account</option></select></div>' +
        '<div class="field"><label for="c-value" id="c-label">Contact details</label>' +
          '<input class="input" id="c-value" autocomplete="off" placeholder="Choose a method first" disabled>' +
          '<span class="hint" id="c-hint">We only use this to arrange your borrowing.</span></div>' +
        '<div class="field"><label for="c-name">Name you\'d like us to use <span class="muted" style="font-weight:400">(optional)</span></label>' +
          '<input class="input" id="c-name" autocomplete="off" placeholder="Anything you like"></div>' +
      "</div>";
    const meth = $("#c-method"), cval = $("#c-value");
    meth.addEventListener("change", () => {
      st.method = meth.value;
      cval.disabled = !meth.value;
      const map = {
        WhatsApp: ["WhatsApp number", "e.g. 03xx xxxxxxx"],
        Email: ["Email address", "you@example.com"],
        "Secondary account": ["Handle or address", "Whatever you check most"],
      };
      const m = map[meth.value] || ["Contact details", "Choose a method first"];
      $("#c-label").textContent = m[0];
      cval.placeholder = m[1];
      sync();
    });
    cval.addEventListener("input", () => { st.contact = cval.value.trim(); sync(); });

    // step 4 — optional contribution
    const cc = cfg().contribution;
    $("#p-give").innerHTML =
      "<h2>Want to contribute?</h2>" +
      '<p class="lead" style="margin-top:0.7rem">Rabt is free to use, and it stays free whatever you choose here.</p>' +
      '<div class="contrib" style="margin-top:1.4rem">' +
        "<p>" + esc(cc.note) + "</p>" +
        '<div class="label" style="margin-top:1.2rem">Contributions go towards</div>' +
        '<ul style="margin-top:0.6rem;display:grid;gap:0.4rem;font-size:var(--fs-small);color:var(--ink-2)">' +
          cc.covers.map((x) => '<li style="display:flex;gap:0.5em;align-items:flex-start">' +
            '<span style="color:var(--olive);flex-shrink:0">&mdash;</span><span>' + esc(x) + "</span></li>").join("") +
        "</ul>" +
        '<div class="contrib__opt" id="b-amounts">' +
          ["Rs 200", "Rs 500", "Rs 1,000", "Another amount", "Not this time"]
            .map((a) => '<button class="amount" role="switch" aria-pressed="false" data-a="' + a + '">' + a + "</button>").join("") +
        "</div>" +
        '<div class="pay" id="b-pay" style="display:none">' +
          '<span class="label">' + esc(cc.account.title) + "</span>" +
          "<span>" + esc(cc.account.line1) + "</span><span>" + esc(cc.account.line2) + "</span><span>" + esc(cc.account.line3) + "</span>" +
          '<span class="muted" style="margin-top:0.4rem">Send whenever suits you — your borrowing is confirmed either way.</span>' +
        "</div>" +
      "</div>";
    $$("#b-amounts .amount").forEach((b) => b.addEventListener("click", () => {
      st.amount = b.dataset.a;
      $$("#b-amounts .amount").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      $("#b-pay").style.display = (st.amount && st.amount !== "Not this time") ? "grid" : "none";
    }));

    // navigation
    let step = st.size ? 1 : 0;
    const panels = ["p-size", "p-when", "p-contact", "p-give"];
    function canAdvance() {
      if (step === 0) return !!st.size;
      if (step === 1) return !!(st.date && st.time);
      if (step === 2) return !!(st.method && st.contact.length > 2);
      return true;
    }
    function sync() {
      $$(".step").forEach((el, i) => el.dataset.state = i === step ? "active" : (i < step ? "done" : ""));
      panels.forEach((p, i) => $("#" + p).dataset.active = i === step ? "1" : "0");
      $("#b-back").style.visibility = step === 0 ? "hidden" : "visible";
      const next = $("#b-next");
      next.textContent = step === panels.length - 1 ? "Confirm request" : "Continue";
      next.setAttribute("aria-disabled", String(!canAdvance()));
      const bits = [item.type, item.colour];
      if (st.size) bits.push("Size " + st.size);
      if (st.date && st.time) bits.push(niceDate(st.date) + ", " + st.time);
      $("#sum-meta").innerHTML = bits.map(esc).join(" &middot; ");
    }
    $("#b-back").addEventListener("click", () => { if (step > 0) { step--; sync(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
    $("#b-next").addEventListener("click", () => {
      if (!canAdvance()) {
        toast(step === 0 ? "Choose a size to continue" : step === 1 ? "Pick a day and a time" : "Add a way for us to reach you");
        return;
      }
      if (step < panels.length - 1) { step++; sync(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      submit();
    });

    function submit() {
      const ref = "RB-" + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
      const req = {
        ref, itemId: item.id, itemName: item.name, size: st.size,
        date: st.date, time: st.time, method: st.method, contact: st.contact,
        name: $("#c-name").value.trim(), contribution: st.amount || "Not this time",
        status: 0, createdAt: new Date().toISOString(),
      };
      store.saveRequest(req);
      $("#borrow-flow").innerHTML =
        '<div class="done">' +
          '<div class="done__mark">' + ICON.check + "</div>" +
          "<h2>That's booked in.</h2>" +
          '<p class="lead" style="margin:0.9rem auto 0;max-width:44ch">We\'ll message you on ' + esc(st.method) +
            " to confirm your collection details for " + fmtFull(new Date(st.date + "T00:00:00")) + " at " + st.time + ".</p>" +
          '<div class="ref">' + ref + "</div>" +
          '<div class="btn-row" style="justify-content:center;margin-top:2rem">' +
            '<a class="btn btn--primary" href="dashboard.html">See my borrowing</a>' +
            '<a class="btn btn--ghost" href="catalogue.html">Back to the catalogue</a>' +
          "</div>" +
        "</div>";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    sync();
    reveal();
  }

  /* ------------------------------------------------------------ dashboard */
  function initDashboard() {
    const root = $("#dash-root");
    if (!root) return;
    const flow = cfg().statusFlow;
    let tab = "current";

    function card(r) {
      const item = itemById(r.itemId);
      const dots = flow.map((_, i) =>
        '<span class="track__dot" data-on="' + (i <= r.status ? 1 : 0) + '"></span>' +
        (i < flow.length - 1 ? '<span class="track__line" data-on="' + (i < r.status ? 1 : 0) + '"></span>' : "")).join("");
      return '<article class="bcard reveal">' +
        '<div class="bcard__media"><img src="assets/img/items/' + r.itemId + '.svg" alt=""></div>' +
        "<div>" +
          '<div style="display:flex;justify-content:space-between;gap:0.6rem;align-items:flex-start">' +
            "<div><div class=\"bcard__t\">" + esc(r.itemName) + "</div>" +
            '<div class="bcard__m">Size ' + esc(r.size) + " &middot; " + niceDate(r.date) + ", " + esc(r.time) + "</div></div>" +
            '<span class="tag">' + esc(r.ref) + "</span>" +
          "</div>" +
          '<div class="track">' + dots + "</div>" +
          '<div class="track-labels"><span>Requested</span><span>Ready</span><span>Returned</span></div>' +
          '<div class="bcard__foot"><span class="badge badge--available" style="border-color:var(--olive-line)">' + esc(flow[r.status]) + "</span>" +
            '<a class="tlink" href="item.html?id=' + r.itemId + '" style="margin-left:auto">View item</a></div>' +
        "</div></article>";
    }

    function render() {
      const all = store.allRequests();
      const cur = all.filter((r) => r.status < flow.length - 1);
      const prev = all.filter((r) => r.status === flow.length - 1);
      const list = tab === "current" ? cur : tab === "previous" ? prev : all;
      $$("#dash-tabs .tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === tab)));
      $("#dash-list").innerHTML = list.length
        ? '<div class="dash-grid">' + list.map(card).join("") + "</div>"
        : '<div class="blank"><p>' + (tab === "previous" ? "Nothing returned yet." : "You haven't borrowed anything yet.") + "</p>" +
          '<a class="btn btn--primary" style="margin-top:1.3rem" href="catalogue.html">Browse the wardrobe</a></div>';
      $("#dash-count").textContent = cur.length;
      reveal();
    }
    $$("#dash-tabs .tab").forEach((t) => t.addEventListener("click", () => { tab = t.dataset.tab; render(); }));
    render();
  }

  /* ------------------------------------------------------------ admin */
  function initAdmin() {
    const root = $("#admin-root");
    if (!root) return;
    const flow = cfg().statusFlow;

    function renderInv() {
      $("#adm-inv").innerHTML = DATA.items.map((i) => {
        const s = statusOf(i);
        return "<tr><td><img class=\"thumb\" src=\"assets/img/items/" + i.id + ".svg\" alt=\"\"></td>" +
          "<td>" + i.id + "</td><td>" + esc(i.name) + "</td><td>" + esc(catBySlug(i.category).name) + "</td>" +
          "<td>" + i.sizes.join(", ") + "</td><td>" + esc(i.colour) + "</td><td>" + esc(i.condition) + "</td>" +
          "<td>" + badge(i) + "</td>" +
          '<td><select class="select" data-inv="' + i.id + '" style="min-width:150px;padding:0.4em 0.6em">' +
            ["available", "borrowed", "soon"].map((v) =>
              '<option value="' + v + '"' + (v === s ? " selected" : "") + ">" +
              (v === "available" ? "Available" : v === "borrowed" ? "Currently borrowed" : "Available soon") + "</option>").join("") +
          "</select></td></tr>";
      }).join("");
      $$("[data-inv]").forEach((sel) => sel.addEventListener("change", () => {
        store.setOverride(sel.dataset.inv, sel.value);
        renderInv(); renderReq(); toast("Availability updated");
      }));
    }

    function renderReq() {
      const all = store.allRequests();
      $("#adm-req").innerHTML = all.length ? all.map((r) =>
        "<tr><td>" + esc(r.ref) + "</td><td>" + esc(r.itemId) + "</td><td>" + esc(r.itemName) + "</td>" +
        "<td>" + esc(r.size) + "</td><td>" + niceDate(r.date) + ", " + esc(r.time) + "</td>" +
        "<td>" + esc(r.method) + "</td><td>" + esc(r.contact) + "</td>" +
        '<td><select class="select" data-req="' + r.ref + '" style="min-width:170px;padding:0.4em 0.6em">' +
          flow.map((f, i) => '<option value="' + i + '"' + (i === r.status ? " selected" : "") + ">" + f + "</option>").join("") +
        "</select></td></tr>").join("")
        : '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:2.4rem">No requests yet. Ones made through the site appear here.</td></tr>';
      $$("[data-req]").forEach((sel) => sel.addEventListener("change", () => {
        store.update(sel.dataset.req, { status: +sel.value });
        toast("Request updated"); renderStats();
      }));
      renderStats();
    }

    function renderStats() {
      const all = store.allRequests();
      const av = DATA.items.filter((i) => statusOf(i) === "available").length;
      $("#adm-total").textContent = DATA.items.length;
      $("#adm-avail").textContent = av;
      $("#adm-outnow").textContent = DATA.items.length - av;
      $("#adm-open").textContent = all.filter((r) => r.status < flow.length - 1).length;
    }
    renderInv(); renderReq();
  }

  /* ------------------------------------------------------------ chrome */
  let io;
  function reveal() {
    if (!("IntersectionObserver" in window)) { $$(".reveal").forEach((e) => e.classList.add("in")); return; }
    if (!io) io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    $$(".reveal:not(.in)").forEach((e) => io.observe(e));
    clearTimeout(reveal._t);
    reveal._t = setTimeout(() => {
      $$(".reveal:not(.in)").forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) e.classList.add("in");
      });
    }, 2200);
  }

  let tT;
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.id = "toast"; document.body.appendChild(t); }
    t.innerHTML = ICON.check + "<span>" + esc(msg) + "</span>";
    t.dataset.show = "1";
    clearTimeout(tT);
    tT = setTimeout(() => { t.dataset.show = "0"; }, 2600);
  }

  function initChrome() {
    const mt = $("#menu-toggle"), mn = $("#mobile-nav");
    if (mt) mt.addEventListener("click", () => { mn.dataset.open = "1"; document.body.style.overflow = "hidden"; });
    if (mn) {
      $("#m-close").addEventListener("click", close);
      $$("a", mn).forEach((a) => a.addEventListener("click", close));
    }
    function close() { mn.dataset.open = "0"; document.body.style.overflow = ""; }
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && mn) close(); });
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
    const n = $("#nav-count");
    if (n) {
      const c = store.allRequests().filter((r) => r.status < 5).length;
      if (c) { n.textContent = c; n.classList.remove("hidden"); }
    }
  }

  ready.then(() => {
    const page = document.body.dataset.page;
    initChrome();
    ({
      home: initHome, catalogue: initCatalogue, item: initItem,
      borrow: initBorrow, dashboard: initDashboard, admin: initAdmin,
    }[page] || (() => {}))();
    reveal();
  }).catch((e) => console.error("Rabt: could not load inventory", e));
})();
