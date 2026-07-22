import { useState } from 'react'
import { Header } from '../components/Header'
import { ArrowUpRight, CheckIcon, SparkIcon } from '../components/Icons'
import { Integrations } from '../components/Integrations'
import { PlatformShowcase } from '../components/PlatformShowcase'
import { SystemCards } from '../components/SystemCards'
import '../App.css'

const capabilities = [
  {
    number: '01',
    title: 'AI agents that get work done',
    text: 'Purpose-built assistants that qualify leads, answer customer questions, prepare reports, and keep operations moving.',
    tags: ['Sales', 'Support', 'Operations'],
  },
  {
    number: '02',
    title: 'Automation made for your stack',
    text: 'Connect the tools your team already depends on, then remove the manual handoffs between them.',
    tags: ['WhatsApp', 'CRM', 'Sheets'],
  },
  {
    number: '03',
    title: 'A product team in your corner',
    text: 'From the first workflow to the customer-facing app around it, we design, build, and support the whole system.',
    tags: ['Strategy', 'Build', 'Support'],
  },
]

const useCases = {
  Sales: {
    eyebrow: 'For sales teams',
    title: 'Never let a high-intent lead go cold.',
    text: 'Capture every enquiry, qualify it intelligently, and send your team the context to close faster.',
    steps: ['New WhatsApp enquiry', 'Qualify & enrich', 'Create CRM lead'],
  },
  Operations: {
    eyebrow: 'For operations',
    title: 'Turn daily tasks into dependable systems.',
    text: 'Connect your requests, data, approvals, and updates into one calm and repeatable flow.',
    steps: ['New request', 'AI checks data', 'Team approval'],
  },
  Support: {
    eyebrow: 'For support',
    title: 'Give customers an answer, not a queue.',
    text: 'Grounded AI assistants resolve common questions and route the tricky ones with all the right details.',
    steps: ['Customer question', 'Find best answer', 'Resolve or escalate'],
  },
}

type UseCase = keyof typeof useCases

export function MarketingPage() {
  const [activeCase, setActiveCase] = useState<UseCase>('Sales')
  const selected = useCases[activeCase]

  return (
    <main>
      <Header />

      <section className="hero section-shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><SparkIcon /> AI automation by 1forge Studio</div>
          <h1>
            From daily process<br />
            to <em>AI-powered flow.</em>
          </h1>
          <p className="hero-intro">We design practical AI agents and automations around the way your business already works — not around the latest buzzword.</p>
          <div className="hero-actions">
            <a className="button button-dark" href="/app">Get started <ArrowUpRight /></a>
            <a className="button button-soft" href="#solutions">See what we build <span>↓</span></a>
          </div>
        </div>
        <div className="hero-video-shell">
          <div className="hero-video-label"><span className="pulse-dot" /> A glimpse of what we can build</div>
          <video className="hero-video" autoPlay muted loop playsInline preload="metadata">
            <source src="https://pub-29f1d49ba0744f3ca3930a65ac24de6f.r2.dev/New_Header_Final%20(compressed).mp4" type="video/mp4" />
            Your browser does not support this video.
          </video>
        </div>
      </section>

      <section className="trust-strip section-shell" aria-label="1forge services">
        <p>Built for the work behind your business</p>
        <div className="trust-items"><span>Websites</span><i /> <span>Apps</span><i /> <span>Systems</span><i /> <span>AI automation</span></div>
      </section>

      <section className="capabilities section-shell" id="solutions">
        <div className="section-heading">
          <div><span className="section-index">01 — What we do</span><h2>Useful AI.<br />Thoughtfully applied.</h2></div>
          <p>Skip the AI theatre. We create clear, custom tools that save time for your team and make every customer interaction feel more considered.</p>
        </div>
        <div className="capability-grid">
          {capabilities.map((item) => (
            <article className="capability-card" key={item.number}>
              <span className="card-number">{item.number}</span>
              <h3>{item.title}</h3><p>{item.text}</p>
              <div className="tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <ArrowUpRight />
            </article>
          ))}
        </div>
      </section>

      <section className="showcase section-shell" aria-label="Agent workflow showcase">
        <PlatformShowcase />
      </section>

      <section className="systems section-shell" id="platform">
        <div className="section-heading">
          <div><span className="section-index">02 — A better operating layer</span><h2>Not another tool.<br /><em>Your work, connected.</em></h2></div>
          <p>We help you connect the business pieces that already exist, then build the smart layer that makes them easier to run.</p>
        </div>
        <SystemCards />
      </section>

      <section className="workflows section-shell" id="workflows">
        <div className="workflow-side">
          <span className="section-index">03 — Built for real work</span>
          <h2>Small moments.<br /><em>Huge leverage.</em></h2>
          <p>Use AI where the volume is high, the process is repeated, and your team deserves more room to think.</p>
          <div className="case-tabs" role="tablist" aria-label="Use cases">
            {(Object.keys(useCases) as UseCase[]).map((item) => (
              <button key={item} className={activeCase === item ? 'active' : ''} onClick={() => setActiveCase(item)} role="tab" aria-selected={activeCase === item}>{item}</button>
            ))}
          </div>
        </div>
        <div className="case-panel">
          <span>{selected.eyebrow}</span>
          <h3>{selected.title}</h3><p>{selected.text}</p>
          <div className="case-flow">
            {selected.steps.map((step, i) => <div className="case-step" key={step}><b>{String(i + 1).padStart(2, '0')}</b><span>{step}</span>{i < 2 && <i>→</i>}</div>)}
          </div>
          <a href="#contact" className="text-link">See how it could work <ArrowUpRight /></a>
        </div>
      </section>

      <Integrations />

      <section className="studio-band">
        <div className="section-shell studio-band-inner">
          <div><span className="section-index">04 — The 1forge difference</span><h2>AI is better when it<br />belongs to the <em>whole system.</em></h2></div>
          <div className="studio-points">
            <article><b>01</b><h3>Strategy + design</h3><p>We find the highest-value workflow before we build.</p></article>
            <article><b>02</b><h3>Software + AI</h3><p>Need an admin panel or app around the automation? We build that too.</p></article>
            <article><b>03</b><h3>Human-first controls</h3><p>Your team stays in the loop for the decisions that need their judgment.</p></article>
            <article><b>04</b><h3>Built to iterate</h3><p>Start useful, learn quickly, then make the system smarter over time.</p></article>
          </div>
        </div>
      </section>

      <section className="process section-shell" id="process">
        <div className="section-heading compact"><div><span className="section-index">05 — Our approach</span><h2>Designed to fit.<br />Ready to grow.</h2></div></div>
        <div className="process-list">
          {[
            ['01', 'Listen', 'We start with the bottlenecks, repeat work, and moments that matter.'],
            ['02', 'Design', 'We map a clear, useful workflow around the people and tools involved.'],
            ['03', 'Build', 'We create, test, and refine your system with your team, not in a vacuum.'],
            ['04', 'Evolve', 'After launch, we improve what is working and add what comes next.'],
          ].map(([number, title, text]) => <div className="process-item" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p><CheckIcon /></div>)}
        </div>
      </section>

      <section className="contact section-shell" id="contact">
        <div className="contact-card">
          <span className="section-index">Start a conversation</span>
          <h2>Let’s make the busywork<br /><em>disappear.</em></h2>
          <p>Tell us what your team spends too much time doing. We’ll help you imagine a better way.</p>
          <a className="button button-light" href="mailto:studio@1forge.in">Tell us about your project <ArrowUpRight /></a>
          <div className="contact-meta"><span>1forge Studio</span><span>studio@1forge.in</span><span>India · Worldwide</span></div>
        </div>
      </section>

      <footer className="footer section-shell"><span>© {new Date().getFullYear()} 1forge Studio</span><a href="#top">Back to top ↑</a></footer>
    </main>
  )
}
