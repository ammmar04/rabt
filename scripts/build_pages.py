#!/usr/bin/env python3
"""Assemble every Rabt page from shared chrome + per-page content.
Output is plain static HTML."""

import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&'
         'family=Karla:wght@400;500;600;700&display=swap">')

CRITICAL = """
:root{--paper:#F7F4ED;--paper-2:#FCFAF5;--paper-3:#EFEAE0;--paper-4:#E5DFD2;--ink:#23241F;--ink-2:#4C4E45;--muted:#83857A;--rule:rgba(35,36,31,.14);--rule-2:rgba(35,36,31,.26);--rule-on-dark:rgba(247,244,237,.18);--olive:#5B6B41;--olive-deep:#3F4B2E;--olive-mid:#6E7F4F;--olive-tint:#E6EBDA;--olive-line:rgba(91,107,65,.32);--brass:#A5834E;--brass-tint:#F3EAD8;--clay:#8E6A57;--display:"Fraunces","Iowan Old Style",Georgia,serif;--sans:"Karla","Helvetica Neue",Arial,sans-serif;--fs-micro:.685rem;--fs-small:.815rem;--fs-body:clamp(.97rem,.94rem + .16vw,1.05rem);--fs-lead:clamp(1.08rem,1rem + .5vw,1.32rem);--fs-h5:clamp(1.05rem,1rem + .3vw,1.2rem);--fs-h4:clamp(1.25rem,1.12rem + .6vw,1.6rem);--fs-h3:clamp(1.55rem,1.3rem + 1.1vw,2.2rem);--fs-h2:clamp(1.95rem,1.5rem + 2vw,3.1rem);--fs-h1:clamp(2.4rem,1.7rem + 3.2vw,4.2rem);--track:.15em;--maxw:1240px;--gutter:clamp(1.15rem,4vw,3.5rem);--section:clamp(3.2rem,7vw,6.5rem);--r:3px;--r-lg:5px;--ease:cubic-bezier(.22,.61,.24,1);--dur:.42s}
*,*::before,*::after{box-sizing:border-box;margin:0}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{font-family:var(--sans);font-size:var(--fs-body);line-height:1.6;color:var(--ink);background-color:var(--paper);-webkit-font-smoothing:antialiased;overflow-x:hidden;position:relative}
img,svg{display:block;max-width:100%}img{height:auto}
a{color:inherit;text-decoration:none}button{cursor:pointer;background:none;border:none;font:inherit;color:inherit}ul{list-style:none;padding:0}
h1,h2,h3,h4,h5{font-family:var(--display);font-weight:500;line-height:1.1;letter-spacing:-.012em}
h1{font-size:var(--fs-h1);line-height:1.02}h2{font-size:var(--fs-h2)}h3{font-size:var(--fs-h3)}
.lead{font-size:var(--fs-lead);line-height:1.55;color:var(--ink-2)}.muted{color:var(--muted)}
.label{font-family:var(--sans);font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:var(--track);color:var(--muted);display:inline-block}
.label--olive{color:var(--olive)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
:focus-visible{outline:2px solid var(--olive);outline-offset:3px}
.skip-link{position:absolute;left:1rem;top:-100px;z-index:300;background:var(--ink);color:var(--paper);padding:.7rem 1.1rem;border-radius:3px}.skip-link:focus{top:1rem}
.wrap{width:100%;max-width:var(--maxw);margin-inline:auto;padding-inline:var(--gutter)}.wrap--narrow{max-width:800px}.wrap--mid{max-width:1000px}
.section{padding-block:var(--section)}.section--tight{padding-block:clamp(2.2rem,4.5vw,3.8rem)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.55em;font-size:var(--fs-small);font-weight:700;text-transform:uppercase;letter-spacing:.09em;padding:.95em 1.7em;border-radius:3px;border:1px solid transparent;transition:background .42s var(--ease),color .42s var(--ease),border-color .42s var(--ease)}
.btn--primary{background:var(--olive);color:#FBFAF6}.btn--primary:hover{background:var(--olive-deep)}
.btn--ghost{border-color:var(--rule-2);color:var(--ink)}.btn--ghost:hover{border-color:var(--ink);background:var(--ink);color:var(--paper)}
.btn--lg{padding:1.1em 2.1em}.btn--block{width:100%}
.btn-row{display:flex;flex-wrap:wrap;gap:.7rem}
.site-header{position:sticky;top:0;z-index:100;background:color-mix(in srgb,var(--paper) 88%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--rule)}
.header-in{display:flex;align-items:center;justify-content:space-between;gap:1rem;height:clamp(62px,7vw,76px)}
.brand{display:inline-flex;align-items:baseline;gap:.5rem}
.brand__mark{font-family:var(--display);font-weight:600;font-size:clamp(1.35rem,2.4vw,1.75rem);letter-spacing:-.015em;line-height:1;color:var(--ink)}
.brand__mark em{color:var(--olive);font-style:normal}
.brand__tag{font-size:var(--fs-micro);letter-spacing:.1em;color:var(--muted);text-transform:uppercase;display:none}
.brand img{height:clamp(26px,3.2vw,34px);width:auto}
@media(min-width:900px){.brand__tag{display:inline}}
.nav{display:none}.nav ul{display:flex;gap:clamp(1.1rem,2.4vw,2.2rem)}
.nav a{font-size:var(--fs-small);font-weight:600;color:var(--ink-2);padding-block:.35rem;position:relative}
.nav a[aria-current=page]{color:var(--ink)}
.header-actions{display:flex;align-items:center;gap:.5rem}
.icon-btn{width:42px;height:42px;display:inline-grid;place-items:center;border-radius:3px}
.icon-btn svg{width:21px;height:21px}
.menu-toggle{display:inline-grid}
@media(min-width:900px){.nav{display:block}.menu-toggle{display:none}}
.hero{position:relative;overflow:hidden;border-bottom:1px solid var(--rule)}
.hero__media{position:absolute;inset:0}.hero__media img{width:100%;height:100%;object-fit:cover}
.hero__scrim{position:absolute;inset:0;background:linear-gradient(96deg,var(--paper) 4%,rgba(247,244,237,.94) 34%,rgba(247,244,237,.55) 56%,rgba(247,244,237,.08) 78%)}
.hero__in{position:relative;z-index:2;min-height:clamp(500px,78vh,760px);display:flex;flex-direction:column;justify-content:center;padding-block:clamp(3rem,8vh,5.5rem)}
.hero h1{max-width:15ch;margin-block:1rem 1.2rem}.hero .lead{max-width:38ch}.hero .btn-row{margin-top:2rem}
@media(max-width:760px){.hero__scrim{background:linear-gradient(4deg,var(--paper) 26%,rgba(247,244,237,.9) 55%,rgba(247,244,237,.3) 100%)}.hero__in{justify-content:flex-end;min-height:clamp(560px,88vh,720px)}}
.page-head{padding-top:clamp(2rem,5vw,3.6rem);padding-bottom:clamp(1.5rem,3vw,2.4rem)}
.page-head h1{max-width:20ch}.page-head p{max-width:54ch;margin-top:1rem}
.crumb{display:flex;gap:.5em;font-size:var(--fs-small);color:var(--muted);margin-bottom:1.2rem}
.site-footer{background:var(--ink);color:var(--paper);margin-top:var(--section)}
.js .reveal{opacity:0;transform:translateY(18px);transition:opacity .6s var(--ease),transform .6s var(--ease)}
.js .reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.js .reveal{opacity:1;transform:none}*{transition-duration:.001ms!important;animation-duration:.001ms!important}}
"""

IC_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>'
IC_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
IC_ARROW = '<svg width="20" height="8" viewBox="0 0 20 8" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M0 4h18M15 1l3 3-3 3"/></svg>'
IC_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'

NAV = [("catalogue.html", "Catalogue", "catalogue"),
       ("how-it-works.html", "How it works", "how"),
       ("about.html", "About", "about"),
       ("contribute.html", "Contribute", "contribute")]


def brand(footer=False):
    cls = "brand" + (" footer-brand-link" if footer else "")
    return ('<a class="' + cls + '" href="index.html" aria-label="Rabt home">'
            '<!-- swap this span for <img src="assets/img/logo.svg" alt="Rabt"> to use the real logo -->'
            '<span class="brand__mark">Rabt<em>.</em></span>'
            + ('' if footer else '<span class="brand__tag">A wardrobe we share</span>') +
            '</a>')


def header(active):
    nav = "".join('<li><a href="%s"%s>%s</a></li>'
                  % (h, ' aria-current="page"' if k == active else "", l) for h, l, k in NAV)
    return ('<a class="skip-link" href="#main">Skip to content</a>'
            '<header class="site-header"><div class="wrap header-in">'
            + brand() +
            '<nav class="nav" aria-label="Primary"><ul>' + nav + '</ul></nav>'
            '<div class="header-actions">'
            '<a class="btn btn--ghost" href="dashboard.html" style="padding:.62em 1.05em">My Rabt'
            '<span id="nav-count" class="badge badge--available hidden" style="margin-left:.5em;padding:.1em .4em"></span></a>'
            '<button class="icon-btn menu-toggle" id="menu-toggle" aria-label="Open menu" aria-controls="mobile-nav">' + IC_MENU + '</button>'
            '</div></div></header>')


def mobile_nav():
    links = "".join('<li><a href="%s">%s</a></li>' % (h, l) for h, l, _ in NAV)
    links += '<li><a href="dashboard.html">My Rabt</a></li>'
    return ('<div class="mobile-nav" id="mobile-nav" data-open="0">'
            '<button class="icon-btn m-close" id="m-close" aria-label="Close menu">' + IC_CLOSE + '</button>'
            '<ul>' + links + '</ul>'
            '<div class="mobile-nav__foot">Free to borrow. Open to everyone on campus.</div></div>')


def footer():
    wardrobe = "".join('<li><a href="catalogue.html?category=%s">%s</a></li>' % (s, n) for s, n in
                       [("suits", "Suits"), ("blazers", "Blazers"), ("shirts", "Collared shirts"), ("trousers", "Formal trousers")])
    about = "".join('<li><a href="%s">%s</a></li>' % (h, l) for h, l in
                    [("how-it-works.html", "How it works"), ("about.html", "About Rabt"),
                     ("contribute.html", "Contribute something"), ("dashboard.html", "My Rabt"),
                     ("privacy.html", "Privacy")])
    return ('<footer class="site-footer"><div class="wrap">'
            '<div class="footer-top">'
            '<div class="footer-brand">' + brand(True) +
            '<p>A shared wardrobe of formal clothing, open to anyone on campus. '
            'Borrow what you need, return it when you are done.</p>'
            '<a class="btn btn--ghost" style="margin-top:1.4rem;border-color:var(--rule-on-dark);color:var(--paper)" href="catalogue.html">Browse the wardrobe</a>'
            '</div>'
            '<div class="fcol"><h3>The wardrobe</h3><ul><li><a href="catalogue.html">Everything</a></li>' + wardrobe + '</ul></div>'
            '<div class="fcol"><h3>Rabt</h3><ul>' + about + '</ul></div>'
            '</div>'
            '<div class="footer-bottom">'
            '<span>&copy; <span id="year">2026</span> Rabt</span>'
            '<span><a href="privacy.html">Privacy</a> &middot; <a href="admin.html">Team</a></span>'
            '</div></div></footer>')


def page(title, desc, active, main_html, key):
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<title>' + title + '</title>'
            '<meta name="description" content="' + desc + '">'
            '<meta name="theme-color" content="#F7F4ED">'
            + FONTS +
            '<style>' + CRITICAL + '</style>'
            '<script>document.documentElement.classList.add("js")</script>'
            '<link rel="stylesheet" href="assets/css/styles.css" media="print" onload="this.media=\'all\'">'
            '<noscript><link rel="stylesheet" href="assets/css/styles.css"></noscript>'
            '</head><body data-page="' + key + '">'
            + header(active) + mobile_nav()
            + '<main id="main">' + main_html + '</main>'
            + footer()
            + '<script src="assets/js/main.min.js" defer></script>'
            '</body></html>')


# =====================================================================
STEPS = [
    ("01", "Browse", "Look through what's on the rail and find something for the occasion."),
    ("02", "Request", "Pick your size and a time that works for you this week."),
    ("03", "Collect", "We message you with where and when to pick it up."),
    ("04", "Return", "Bring it back when you're done. We take care of the cleaning."),
]


def steps_block():
    return '<div class="steps">' + "".join(
        '<div class="hstep reveal" data-d="%d"><span class="hstep__n">%s</span><h3>%s</h3><p>%s</p></div>'
        % ((i % 4) + 1, n, t, d) for i, (n, t, d) in enumerate(STEPS)) + '</div>'


def home():
    return (
        '<section class="hero">'
        '<div class="hero__media"><img src="assets/img/hero.svg" alt="A rail of formal clothing from the Rabt wardrobe" width="1600" height="900" fetchpriority="high"></div>'
        '<div class="hero__scrim"></div>'
        '<div class="wrap hero__in">'
        '<span class="label label--olive">The campus wardrobe</span>'
        '<h1>Borrow what you need.</h1>'
        '<p class="lead">Formal clothing for interviews, presentations, defences and anything with a dress code. '
        'Free to borrow, open to everyone &mdash; no eligibility check, no explaining why.</p>'
        '<div class="btn-row"><a class="btn btn--primary btn--lg" href="catalogue.html">Browse the wardrobe</a>'
        '<a class="btn btn--ghost btn--lg" href="how-it-works.html">How it works</a></div>'
        '<div class="hero__meta">'
        '<span>' + IC_CHECK + 'Free to borrow</span>'
        '<span>' + IC_CHECK + 'No forms about why you need it</span>'
        '<span>' + IC_CHECK + '<strong id="stat-available">&mdash;</strong>&nbsp;pieces available now</span>'
        '</div></div></section>'

        # categories
        '<section class="wrap section">'
        '<div class="head reveal" style="margin-bottom:clamp(1.6rem,3vw,2.4rem)">'
        '<span class="label">Browse by</span><h2>Start with what you need.</h2></div>'
        '<div class="cat-grid" id="home-cats"></div></section>'

        # available now
        '<section class="wrap section--tight">'
        '<div class="head reveal" style="margin-bottom:clamp(1.4rem,3vw,2rem)">'
        '<span class="label">On the rail</span><h2>Available right now.</h2></div>'
        '<div class="items items--4" id="home-items"></div>'
        '<div class="center" style="margin-top:2.4rem"><a class="btn btn--ghost btn--lg" href="catalogue.html">See the whole wardrobe</a></div>'
        '</section>'

        # how it works
        '<section class="section--tight"><div class="wrap head reveal" style="margin-bottom:1.6rem">'
        '<span class="label">How it works</span><h2>Four steps, and none of them awkward.</h2></div>'
        + steps_block() + '</section>'

        # the community idea — short, not an essay
        '<section class="wrap section">'
        '<div class="split">'
        '<div class="split__media reveal"><img src="assets/img/scene/about.svg" alt="Clothing from the Rabt wardrobe" width="1200" height="800" loading="lazy"></div>'
        '<div class="split__body reveal" data-d="1">'
        '<span class="label">The idea</span>'
        '<h2 style="margin-top:.6rem">A wardrobe nobody owns.</h2>'
        '<p>Most of us need formal clothes a handful of times a year. Buying a suit for one interview '
        'rarely makes sense, and borrowing from a friend depends on having a friend your size.</p>'
        '<p>Rabt is the in-between: a shared rail that anyone on campus can use, kept going by people '
        'passing on things they no longer wear. You borrow it, you return it, someone else borrows it next.</p>'
        '<a class="tlink" href="about.html" style="margin-top:.4rem">More about Rabt ' + IC_ARROW + '</a>'
        '</div></div></section>'

        # contribute
        '<section class="wrap section--tight"><div class="split split--flip">'
        '<div class="split__media reveal"><img src="assets/img/scene/contribute.svg" alt="Formal clothing ready to be shared" width="1200" height="800" loading="lazy"></div>'
        '<div class="split__body reveal" data-d="1">'
        '<span class="label">Contribute</span>'
        '<h2 style="margin-top:.6rem">Have something worth sharing?</h2>'
        '<p>A blazer that no longer fits, a shirt you have not worn in two years, a suit from a wedding. '
        'If it is clean and in good condition, it will get used.</p>'
        '<div class="btn-row" style="margin-top:1.4rem"><a class="btn btn--primary" href="contribute.html">How to contribute</a></div>'
        '</div></div></section>'
    )


def catalogue():
    return (
        '<section class="wrap page-head">'
        '<span class="label label--olive">The wardrobe</span>'
        '<h1 style="margin-top:1rem">Everything on the rail.</h1>'
        '<p class="lead">Borrow any of it, free. Items already out are still listed so you can see the '
        'full wardrobe and when they are due back.</p></section>'
        '<section class="wrap section--tight"><div class="cat-layout">'
        '<aside class="filters" aria-label="Filter the wardrobe">'
        '<div class="fgroup"><label class="label" for="cat-search">Search</label>'
        '<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'
        '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
        '<input id="cat-search" type="search" placeholder="Navy blazer, size M&hellip;" autocomplete="off"></div></div>'
        '<div class="fgroup"><span class="label">Type</span><div class="chips" id="f-category"></div></div>'
        '<div class="fgroup"><span class="label">Size</span><div class="chips" id="f-size"></div></div>'
        '<div class="fgroup"><span class="label">Availability</span><div class="chips" id="f-avail"></div></div>'
        '<div class="fgroup"><span class="label">Colour</span><div class="chips" id="f-colour"></div></div>'
        '</aside>'
        '<div><div class="toolbar"><span class="label" id="cat-count">&mdash;</span>'
        '<button class="tlink" id="cat-reset" type="button">Clear filters</button></div>'
        '<div class="items items--4" id="cat-grid"></div></div>'
        '</div></section>'
    )


def item_page():
    return '<div class="wrap section--tight" id="item-root"><p class="muted">Loading&hellip;</p></div>'


def borrow_page():
    return (
        '<section class="wrap wrap--narrow section--tight" id="borrow-root">'
        '<div id="borrow-flow">'
        '<div class="summary" id="summary"></div>'
        '<div class="stepper" id="stepper"></div>'
        '<div class="panel" id="p-size" data-active="1"></div>'
        '<div class="panel" id="p-when"></div>'
        '<div class="panel" id="p-contact"></div>'
        '<div class="panel" id="p-give"></div>'
        '<div class="btn-row" style="margin-top:2.2rem;justify-content:space-between">'
        '<button class="btn btn--quiet" id="b-back" type="button">Back</button>'
        '<button class="btn btn--primary" id="b-next" type="button">Continue</button>'
        '</div></div></section>'
    )


def dashboard():
    return (
        '<section class="wrap page-head">'
        '<span class="label label--olive">My Rabt</span>'
        '<h1 style="margin-top:1rem">Your borrowing.</h1>'
        '<p class="lead">You have <strong id="dash-count">0</strong> active request(s). '
        'Only you can see this &mdash; it lives on this device.</p></section>'
        '<section class="wrap section--tight" id="dash-root">'
        '<div class="tabs" id="dash-tabs" role="tablist">'
        '<button class="tab" data-tab="current" aria-selected="true">Current</button>'
        '<button class="tab" data-tab="previous" aria-selected="false">Previous</button>'
        '<button class="tab" data-tab="all" aria-selected="false">All requests</button>'
        '</div><div id="dash-list"></div></section>'
    )


def how_it_works():
    faqs = [
        ("How long can I keep something?",
         "Up to a week as standard. If you need it longer, say so when we confirm &mdash; it is usually fine."),
        ("What if it does not fit?",
         "Message us and we will swap it for another size if we have one, or find you something similar. "
         "Nothing is final until it actually fits."),
        ("Do I need to clean it before returning?",
         "No. Return it as-is and we handle the cleaning. That cost is what contributions go towards."),
        ("Is there any cost?",
         "No. Borrowing is free. There is an optional contribution at the end of the request if you want to "
         "chip in towards cleaning and repairs, and skipping it changes nothing."),
        ("Who can use Rabt?",
         "Anyone on campus. There is no eligibility check, no proof of anything, and no application asking "
         "about your circumstances."),
        ("Can I borrow two things at once?",
         "Yes, but as two separate requests &mdash; each piece is tracked and prepared on its own. "
         "Just go through the flow again for the second item."),
    ]
    faq_html = "".join(
        '<div class="pdp__block reveal"><h3 style="font-family:var(--sans);font-size:var(--fs-h5);font-weight:700;letter-spacing:0">%s</h3>'
        '<p class="muted" style="margin-top:.5rem;max-width:60ch">%s</p></div>' % (q, a) for q, a in faqs)
    return (
        '<section class="wrap page-head">'
        '<span class="label label--olive">How it works</span>'
        '<h1 style="margin-top:1rem">Borrow something in about two minutes.</h1>'
        '<p class="lead">Find a piece, tell us your size and when you can collect it, and we take it from there.</p>'
        '</section>'
        '<section class="section--tight">' + steps_block() + '</section>'
        '<section class="wrap wrap--mid section--tight">'
        '<div class="head reveal" style="margin-bottom:1rem"><span class="label">Good to know</span>'
        '<h2>The details.</h2></div>' + faq_html +
        '<div class="note reveal" style="margin-top:2rem">Still unsure about something? Ask before you request &mdash; '
        'there is no wrong question, and you do not have to explain why you need anything.</div>'
        '<div class="center" style="margin-top:2.4rem"><a class="btn btn--primary btn--lg" href="catalogue.html">Browse the wardrobe</a></div>'
        '</section>'
    )


def about():
    return (
        '<section class="wrap page-head">'
        '<span class="label label--olive">About</span>'
        '<h1 style="margin-top:1rem">A wardrobe that belongs to everyone who uses it.</h1>'
        '<p class="lead">Rabt started from a simple observation: a lot of people need formal clothes '
        'occasionally, almost nobody needs them often, and buying a suit for one interview is a strange '
        'thing to ask of someone.</p></section>'

        '<section class="wrap section--tight"><div class="split">'
        '<div class="split__media reveal"><img src="assets/img/scene/about.svg" alt="Pieces from the Rabt wardrobe" width="1200" height="800" loading="lazy"></div>'
        '<div class="split__body reveal" data-d="1">'
        '<span class="label">How we think about it</span>'
        '<h2 style="margin-top:.6rem">A service, not a favour.</h2>'
        '<p>The easiest way to make borrowing feel uncomfortable is to make someone prove they deserve it. '
        'So Rabt does not ask. There is no eligibility test, no means check, no form explaining your situation, '
        'and no word like &ldquo;beneficiary&rdquo; anywhere in it.</p>'
        '<p>You browse a rail, pick something, choose a time, and collect it. The same experience for everyone, '
        'because that is the only version that actually works.</p>'
        '</div></div></section>'

        '<section class="wrap section--tight"><div class="split split--flip">'
        '<div class="split__media reveal"><img src="assets/img/scene/contribute.svg" alt="Clothing contributed to Rabt" width="1200" height="800" loading="lazy"></div>'
        '<div class="split__body reveal" data-d="1">'
        '<span class="label">Where it comes from</span>'
        '<h2 style="margin-top:.6rem">Shared, not donated.</h2>'
        '<p>Everything on the rail was passed on by someone on campus &mdash; a blazer outgrown, a suit worn once, '
        'a shirt that never got used. It stays in circulation instead of a cupboard.</p>'
        '<p>That is also why the wardrobe is not anyone\'s property. It is maintained by whoever is running Rabt '
        'this year, and built to keep working when they hand it on.</p>'
        '</div></div></section>'

        '<section class="wrap wrap--mid section--tight">'
        '<div class="head reveal"><span class="label">Privacy</span>'
        '<h2>What we keep, and what we do not.</h2>'
        '<p>We ask for one thing: a way to reach you about your borrowing. Not your student ID, not your '
        'financial situation, not a reason. There are no public lists of who has borrowed what, and there '
        'never will be.</p></div>'
        '<a class="tlink reveal" href="privacy.html" style="margin-top:1.2rem">Read the privacy note ' + IC_ARROW + '</a>'
        '</section>'

        '<section class="wrap section--tight center">'
        '<div class="reveal" style="max-width:40rem;margin-inline:auto">'
        '<h2>Have a look at what is on the rail.</h2>'
        '<div class="btn-row" style="justify-content:center;margin-top:1.6rem">'
        '<a class="btn btn--primary btn--lg" href="catalogue.html">Browse the wardrobe</a>'
        '<a class="btn btn--ghost btn--lg" href="contribute.html">Contribute something</a></div>'
        '</div></section>'
    )


def contribute():
    takes = [("Suits", "Two- or three-piece, any conventional colour."),
             ("Blazers", "Standalone jackets get borrowed constantly."),
             ("Collared shirts", "Especially white and light blue, all sizes."),
             ("Formal trousers", "Flat-front or pleated, hemmed or unhemmed."),
             ("Anything adjacent", "Waistcoats, ties, belts, formal shoes &mdash; ask us.")]
    cards = "".join(
        '<div class="hstep reveal" data-d="%d"><h3>%s</h3><p>%s</p></div>' % ((i % 4) + 1, t, d)
        for i, (t, d) in enumerate(takes))
    return (
        '<section class="wrap page-head">'
        '<span class="label label--olive">Contribute</span>'
        '<h1 style="margin-top:1rem">Have something worth sharing?</h1>'
        '<p class="lead">If it is clean, in good condition and someone would be glad to wear it to an '
        'interview, it belongs on the rail.</p>'
        '<div class="btn-row" style="margin-top:1.8rem">'
        '<a class="btn btn--primary btn--lg" href="#hand-over">How to hand it over</a></div>'
        '</section>'

        '<section class="section--tight"><div class="wrap head reveal" style="margin-bottom:1.4rem">'
        '<span class="label">What gets used most</span><h2>Things we are always short of.</h2></div>'
        '<div class="steps">' + cards + '</div></section>'

        '<section class="wrap wrap--mid section--tight" id="hand-over" style="scroll-margin-top:100px">'
        '<div class="head reveal"><span class="label">Handing it over</span><h2>Three things, then it is done.</h2></div>'
        '<div class="reveal" style="margin-top:1.6rem;display:grid;gap:1rem">'
        '<div class="note"><strong>1. Message us</strong><br>Tell us roughly what you have and the size. '
        'A photo helps but is not necessary.</div>'
        '<div class="note"><strong>2. We agree a time</strong><br>Somewhere on campus that suits you. '
        'It takes a minute.</div>'
        '<div class="note"><strong>3. We take it from there</strong><br>We clean it, measure it, photograph '
        'it and add it to the rail. If it turns out not to be usable we will pass it on somewhere it will be.</div>'
        '</div>'
        '<div class="contrib reveal" style="margin-top:2rem">'
        '<span class="label">Get in touch</span>'
        '<p style="margin-top:.7rem">Message Rabt however is easiest &mdash; the contact details are in the '
        'footer of every page. Tell us what you have and we will sort the rest.</p>'
        '<p class="muted" style="font-size:var(--fs-small);margin-top:1rem">Not able to contribute clothing? '
        'Contributions towards cleaning and repairs are just as useful, and entirely optional at every step.</p>'
        '</div></section>'
    )


def privacy():
    return (
        '<section class="wrap page-head">'
        '<span class="label label--olive">Privacy</span>'
        '<h1 style="margin-top:1rem">What Rabt keeps.</h1>'
        '<p class="lead">Short version: a way to contact you about your borrowing, and nothing else.</p>'
        '</section>'
        '<section class="wrap wrap--narrow section--tight">'
        '<div class="reveal" style="display:grid;gap:1.6rem">'
        '<div><h3 style="font-family:var(--sans);font-size:var(--fs-h5);font-weight:700;letter-spacing:0">What we collect</h3>'
        '<p class="muted" style="margin-top:.5rem">The item you asked for, your size, the day and time you '
        'chose, and the contact detail you gave us. Optionally a name you would like us to use.</p></div>'
        '<div><h3 style="font-family:var(--sans);font-size:var(--fs-h5);font-weight:700;letter-spacing:0">What we do not collect</h3>'
        '<p class="muted" style="margin-top:.5rem">Student ID numbers, financial information, proof of need, '
        'your reason for borrowing, or any background about your circumstances. We do not ask, so there is '
        'nothing to store.</p></div>'
        '<div><h3 style="font-family:var(--sans);font-size:var(--fs-h5);font-weight:700;letter-spacing:0">Who can see it</h3>'
        '<p class="muted" style="margin-top:.5rem">The small team running Rabt, only to prepare and hand over '
        'your borrowing. There are no public lists of who has borrowed what, and we do not share details with '
        'anyone else.</p></div>'
        '<div><h3 style="font-family:var(--sans);font-size:var(--fs-h5);font-weight:700;letter-spacing:0">How long we keep it</h3>'
        '<p class="muted" style="margin-top:.5rem">Request records are kept while the item is out and for a '
        'short period after it is returned, so we can keep the wardrobe in order. Ask us to remove your details '
        'at any point and we will.</p></div>'
        '<div><h3 style="font-family:var(--sans);font-size:var(--fs-h5);font-weight:700;letter-spacing:0">On this website</h3>'
        '<p class="muted" style="margin-top:.5rem">Your borrowing history on the My Rabt page is stored in your '
        'own browser, on your own device. No advertising or tracking cookies are set.</p></div>'
        '</div></section>'
    )


def admin():
    return (
        '<section class="wrap page-head">'
        '<span class="label label--olive">Team</span>'
        '<h1 style="margin-top:1rem">Wardrobe admin.</h1>'
        '<p class="lead">Inventory and incoming requests. For the MVP this reads the catalogue file and '
        'stores changes in this browser &mdash; point it at the Google Sheet when you are ready.</p></section>'

        '<section class="wrap section--tight" id="admin-root">'
        '<div class="stat-row reveal">'
        '<div class="stat"><div class="stat__n" id="adm-total">&mdash;</div><div class="stat__l">Items in wardrobe</div></div>'
        '<div class="stat"><div class="stat__n" id="adm-avail">&mdash;</div><div class="stat__l">Available</div></div>'
        '<div class="stat"><div class="stat__n" id="adm-outnow">&mdash;</div><div class="stat__l">Out or in cleaning</div></div>'
        '<div class="stat"><div class="stat__n" id="adm-open">&mdash;</div><div class="stat__l">Open requests</div></div>'
        '</div>'

        '<div class="label label--rule reveal" style="margin:2.6rem 0 1rem">Incoming requests</div>'
        '<div class="tbl-wrap reveal"><table class="tbl">'
        '<thead><tr><th>Ref</th><th>Item</th><th>Name</th><th>Size</th><th>Requested</th>'
        '<th>Contact via</th><th>Details</th><th>Status</th></tr></thead>'
        '<tbody id="adm-req"></tbody></table></div>'

        '<div class="label label--rule reveal" style="margin:2.6rem 0 1rem">Inventory</div>'
        '<div class="tbl-wrap reveal"><table class="tbl">'
        '<thead><tr><th></th><th>ID</th><th>Item</th><th>Category</th><th>Sizes</th><th>Colour</th>'
        '<th>Condition</th><th>Status</th><th>Set availability</th></tr></thead>'
        '<tbody id="adm-inv"></tbody></table></div>'

        '<div class="note reveal" style="margin-top:2rem"><strong>Connecting the real backend.</strong><br>'
        'The four sheets in <code>data/sheets/</code> match this structure. Publish a Google Apps Script web '
        'app that appends to them, then set <code>ENDPOINT</code> at the top of '
        '<code>assets/js/main.js</code> &mdash; requests will POST there as well as saving locally. '
        'Nothing else needs to change.</div>'
        '</section>'
    )


PAGES = [
    ("index.html", "Rabt — Borrow what you need", "A shared wardrobe of formal clothing, free to borrow for anyone on campus. No eligibility check, no forms.", None, home(), "home"),
    ("catalogue.html", "Catalogue — Rabt", "Browse the Rabt wardrobe: suits, blazers, collared shirts and formal trousers. Filter by type, size, colour and availability.", "catalogue", catalogue(), "catalogue"),
    ("item.html", "Item — Rabt", "An item from the Rabt wardrobe.", "catalogue", item_page(), "item"),
    ("borrow.html", "Borrow — Rabt", "Request an item from the Rabt wardrobe in four short steps.", "catalogue", borrow_page(), "borrow"),
    ("dashboard.html", "My Rabt", "Your current and previous borrowings.", None, dashboard(), "dashboard"),
    ("how-it-works.html", "How it works — Rabt", "How borrowing from Rabt works: browse, request, collect, return.", "how", how_it_works(), "how"),
    ("about.html", "About — Rabt", "Rabt is a shared wardrobe of formal clothing on campus, built around dignity, privacy and shared ownership.", "about", about(), "about"),
    ("contribute.html", "Contribute — Rabt", "Contribute formal clothing to the Rabt wardrobe.", "contribute", contribute(), "contribute"),
    ("privacy.html", "Privacy — Rabt", "What Rabt collects, and what it deliberately does not.", None, privacy(), "privacy"),
    ("admin.html", "Wardrobe admin — Rabt", "Rabt team view: inventory and requests.", None, admin(), "admin"),
]


def main():
    for fname, title, desc, active, content, key in PAGES:
        with open(os.path.join(ROOT, fname), "w") as f:
            f.write(page(title, desc, active, content, key))
    print("wrote %d pages" % len(PAGES))


if __name__ == "__main__":
    main()
