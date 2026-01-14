import React, { useState } from 'react';
import { Send, Loader2, Globe, Terminal, MousePointer2, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodeBlock } from '@/components/CodeBlock';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ApiResponse, ProxyResponse, ProxyFormat } from '@shared/types';
type PlaygroundEndpoint = 'proxy' | ProxyFormat;
export function ProxyPlayground() {
  const [url, setUrl] = useState('https://en.wikipedia.org/wiki/Cloudflare');
  const [endpoint, setEndpoint] = useState<PlaygroundEndpoint>('proxy');
  const [selector, setSelector] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProxyResponse | null>(null);
  const handleTest = async () => {
    if (!url) {
      toast.error('Enter a target URL');
      return;
    }
    if ((endpoint === 'class' || endpoint === 'id') && !selector) {
      toast.error(`Please provide a ${endpoint === 'class' ? 'class name' : 'element ID'}`);
      return;
    }
    setLoading(true);
    setResult(null);
    const startTimestamp = performance.now();
    try {
      const params = new URLSearchParams({ url });
      if (endpoint === 'class') params.append('class', selector);
      if (endpoint === 'id') params.append('id', selector);
      const res = await fetch(`/api/${endpoint}?${params.toString()}`);
      const contentType = res.headers.get('content-type') || '';
      const clientLatency = Math.round(performance.now() - startTimestamp);
      if (contentType.includes('application/json')) {
        const data = await res.json() as ApiResponse<ProxyResponse>;
        if (data.success && data.data) {
          setResult({
            ...data.data,
            status: { ...data.data.status, response_time_ms: clientLatency }
          });
        } else {
          toast.error(data.error || 'Request failed');
        }
      } else {
        const text = await res.text();
        setResult({
          url,
          format: 'default',
          contents: text,
          status: { 
            url, 
            content_type: contentType, 
            http_code: res.status, 
            response_time_ms: clientLatency 
          }
        });
      }
    } catch (err) {
      toast.error('Connection failed');
    } finally {
      setLoading(false);
    }
  };
  const getCodeSnippet = () => {
    const origin = window.location.origin;
    const isRaw = endpoint === 'proxy';
    return `// FluxGate Edge Implementation
const apiUrl = new URL('/api/${endpoint}', '${origin}');
apiUrl.searchParams.append('url', '${url}');
${(endpoint === 'class' || endpoint === 'id') ? `apiUrl.searchParams.append('${endpoint}', '${selector}');\n` : ''}
fetch(apiUrl.toString())
  .then(res => ${isRaw ? 'res.text()' : 'res.json()'})
  .then(data => {
    console.log('FluxGate Response:', data);
  })
  .catch(err => console.error('Proxy Error:', err));`;
  };
  const getOutputCode = () => {
    if (!result) return '';
    if (endpoint === 'proxy') return result.contents || '';
    // Clean output for JSON displays
    const { contents, ...display } = result;
    // For specialized endpoints, we might want to emphasize the specific data
    if (endpoint === 'text') return JSON.stringify({ text: result.text, status: result.status }, null, 2);
    if (endpoint === 'images') return JSON.stringify({ images: result.images, status: result.status }, null, 2);
    if (endpoint === 'links') return JSON.stringify({ links: result.links, status: result.status }, null, 2);
    if (endpoint === 'videos') return JSON.stringify({ videos: result.videos, status: result.status }, null, 2);
    return JSON.stringify(display, null, 2);
  };
  return (
    <div className="w-full bg-slate-900/30 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-6 md:p-8 space-y-6 border-b border-white/5 bg-slate-900/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-4 space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Target URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="bg-slate-950 border-white/10 h-12 pl-10 focus:ring-indigo-500/50"
              />
            </div>
          </div>
          <div className="lg:col-span-3 space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Endpoint Path</label>
            <Select value={endpoint} onValueChange={(v) => setEndpoint(v as PlaygroundEndpoint)}>
              <SelectTrigger className="bg-slate-950 border-white/10 h-12 font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proxy">/api/proxy (Raw)</SelectItem>
                <SelectItem value="json">/api/json (Full)</SelectItem>
                <SelectItem value="text">/api/text (Text)</SelectItem>
                <SelectItem value="images">/api/images (Images)</SelectItem>
                <SelectItem value="videos">/api/videos (Videos)</SelectItem>
                <SelectItem value="links">/api/links (Links)</SelectItem>
                <SelectItem value="class">/api/class (Selector)</SelectItem>
                <SelectItem value="id">/api/id (Selector)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(endpoint === 'class' || endpoint === 'id') && (
            <div className="lg:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                {endpoint === 'class' ? 'Class Name' : 'Element ID'}
              </label>
              <div className="relative">
                <MousePointer2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input value={selector} onChange={(e) => setSelector(e.target.value)} placeholder={endpoint === 'class' ? "content-body" : "main-header"} className="bg-slate-950 border-white/10 h-12 pl-9" />
              </div>
            </div>
          )}
          <div className={cn("space-y-2", (endpoint === 'class' || endpoint === 'id') ? "lg:col-span-3" : "lg:col-span-5")}>
            <Button onClick={handleTest} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 h-12 w-full font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-transform">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2 fill-current" />}
              {loading ? 'Processing...' : 'Execute Request'}
            </Button>
          </div>
        </div>
      </div>
      <div className="p-6 bg-slate-950/50">
        <Tabs defaultValue="output" className="w-full">
          <TabsList className="bg-slate-900/80 border border-white/5 mb-6 p-1">
            <TabsTrigger value="output" className="px-6 py-2 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">Response</TabsTrigger>
            <TabsTrigger value="code" className="px-6 py-2 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">API Snippet</TabsTrigger>
          </TabsList>
          <TabsContent value="output" className="min-h-[400px] outline-none">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                <p className="text-sm font-medium">Processing at the Edge...</p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  <Badge label="Endpoint" val={`/api/${endpoint}`} />
                  <Badge label="Status" val={result.status.http_code} variant={result.status.http_code >= 400 ? 'error' : 'success'} />
                  <Badge label="Latency" val={`${result.status.response_time_ms}ms`} />
                </div>
                <CodeBlock language={endpoint === 'proxy' ? 'html' : 'json'} code={getOutputCode()} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-600 border-2 border-dashed border-white/5 rounded-xl">
                <Terminal className="w-10 h-10 opacity-20 mb-4" />
                <p className="text-sm font-medium">Choose an endpoint and target URL to begin testing</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="code" className="outline-none">
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Integrate this FluxGate endpoint into your client application:</p>
              <CodeBlock language="javascript" code={getCodeSnippet()} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
function Badge({ label, val, variant = 'default' }: { label: string, val: string | number, variant?: 'default' | 'success' | 'error' }) {
  const styles = {
    default: "bg-white/5 border-white/10 text-indigo-400",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    error: "bg-red-500/10 border-red-500/20 text-red-400"
  };
  return (
    <div className={cn("px-3 py-1 border rounded-md flex items-center gap-2", styles[variant])}>
      <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">{label}</span>
      <span className="text-xs font-mono font-bold">{val}</span>
    </div>
  );
}