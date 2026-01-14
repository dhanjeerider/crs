import React from 'react';
import { CodeBlock } from '@/components/CodeBlock';
import { Zap, ArrowLeft, Layout, MousePointer2, Settings2, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
export function DocsPage() {
  const origin = window.location.origin;
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <ThemeToggle />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-20">
          <header className="space-y-6">
            <Link to="/">
              <Button variant="ghost" className="text-slate-400 hover:text-white -ml-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Zap className="w-8 h-8 text-indigo-500" />
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">API Documentation</h1>
              </div>
              <p className="text-xl text-slate-400 max-w-3xl leading-relaxed">
                FluxGate v2.1 provides high-performance, path-based routing. Each endpoint is optimized for specific data structures and edge speed.
              </p>
            </div>
          </header>
          <section id="endpoints" className="space-y-10">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-indigo-500" /> Core API Endpoints
            </h2>
            <div className="grid gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-400">/api/proxy — Transparent Passthrough</h3>
                <p className="text-slate-400">Directly pipes the upstream response with permissive CORS headers. Ideal for media, downloads, or existing REST APIs.</p>
                <CodeBlock 
                  language="javascript" 
                  code={`const url = new URL('/api/proxy', '${origin}');\nurl.searchParams.append('url', 'https://api.example.com/data');\n\nfetch(url.toString())\n  .then(res => res.blob())\n  .then(blob => console.log('Asset Loaded'));`} 
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-400">/api/json — Metadata & Enrichment</h3>
                <p className="text-slate-400">Returns parsed metadata including page title, description, and asset arrays (images, videos, links).</p>
                <CodeBlock 
                  language="bash" 
                  code={`# Replace <your-domain> with your FluxGate instance host\ncurl "https://<your-domain>/api/json?url=https://wikipedia.org"`} 
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-400">/api/text — Readability Engine</h3>
                <p className="text-slate-400">Extracts clean text content from any HTML page by removing scripts, styles, and boilerplate markup.</p>
                <CodeBlock 
                  language="javascript" 
                  code={`const textUrl = new URL('/api/text', '${origin}');\ntextUrl.searchParams.append('url', 'https://news.ycombinator.com');\n\nfetch(textUrl.toString())\n  .then(res => res.json())\n  .then(data => console.log(data.text));`} 
                />
              </div>
            </div>
          </section>
          <section id="selectors" className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MousePointer2 className="w-5 h-5 text-indigo-500" /> Precise Fragment Extraction
            </h2>
            <p className="text-slate-400">Target specific DOM nodes using CSS class names or unique IDs using dedicated path-based selectors.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/50 border border-white/10 rounded-lg space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Class Selector</p>
                <code className="text-indigo-400 text-sm block bg-black/40 p-2 rounded">/api/class?url=[target]&class=[name]</code>
                <p className="text-xs text-slate-500">Extracts all elements matching the specified CSS class.</p>
              </div>
              <div className="p-6 bg-slate-900/50 border border-white/10 rounded-lg space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID Selector</p>
                <code className="text-indigo-400 text-sm block bg-black/40 p-2 rounded">/api/id?url=[target]&id=[element-id]</code>
                <p className="text-xs text-slate-500">Extracts the unique element matching the provided ID.</p>
              </div>
            </div>
          </section>
          <section id="reference" className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-500" /> Full Routing Reference
            </h2>
            <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/20">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white/5 text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Endpoint Path</th>
                    <th className="px-6 py-4">Response Format</th>
                    <th className="px-6 py-4">Primary Use Case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-400">
                  <tr>
                    <td className="px-6 py-4 font-mono text-indigo-400 font-bold">/api/proxy</td>
                    <td className="px-6 py-4 italic">Raw Stream</td>
                    <td className="px-6 py-4">Asset bypass & transparent API proxying.</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-indigo-400 font-bold">/api/json</td>
                    <td className="px-6 py-4">JSON Object</td>
                    <td className="px-6 py-4">URL unfurling and full metadata extraction.</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-indigo-400 font-bold">/api/text</td>
                    <td className="px-6 py-4">JSON (Text)</td>
                    <td className="px-6 py-4">LLM data ingestion and content reading.</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-indigo-400 font-bold">/api/images</td>
                    <td className="px-6 py-4">JSON (Array)</td>
                    <td className="px-6 py-4">Image discovery and gallery builders.</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-indigo-400 font-bold">/api/videos</td>
                    <td className="px-6 py-4">JSON (Array)</td>
                    <td className="px-6 py-4">Media asset indexing.</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-indigo-400 font-bold">/api/links</td>
                    <td className="px-6 py-4">JSON (Array)</td>
                    <td className="px-6 py-4">Quick site mapping and link checking.</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-indigo-400 font-bold">/api/class</td>
                    <td className="px-6 py-4">JSON Object</td>
                    <td className="px-6 py-4">Targeted scraping by CSS class.</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-indigo-400 font-bold">/api/id</td>
                    <td className="px-6 py-4">JSON Object</td>
                    <td className="px-6 py-4">Targeted scraping by Element ID.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 italic text-center">
              Note: All endpoints require the `url` query parameter to be an absolute, URL-encoded string.
            </p>
          </section>
          <footer className="pt-12 border-t border-white/5 text-center text-slate-600 text-xs tracking-widest uppercase">
            FluxGate Engine &bull; Edge-First Architecture &bull; v2.1
          </footer>
        </div>
      </div>
    </div>
  );
}