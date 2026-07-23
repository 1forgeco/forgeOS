import { ArrowLeft, Compass, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../styles/product.css'

export function NotFoundPage() {
  return (
    <main className="public-info-page not-found-page">
      <section className="public-info-hero">
        <span><Compass size={14} /> Page not found</span>
        <h1>This route does not exist.</h1>
        <p>The link may be old, or the agent may have been removed. Your saved workspace has not been changed.</p>
        <div className="not-found-actions">
          <Link className="detail-cta" to="/"><ArrowLeft size={14} /> ForgeOS home</Link>
          <Link to="/projects"><Workflow size={14} /> Open workspace</Link>
        </div>
      </section>
    </main>
  )
}
