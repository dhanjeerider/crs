import { Hono } from "hono";
import { Env } from './core-utils';
import type { ApiResponse, ProxyResponse, ProxyFormat, ExtractedElement } from '@shared/types';
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const getBrowserHeaders = (url: string) => {
  const { host, origin } = new URL(url);
  return {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Host": host,
    ...(!origin || origin === 'null' ? {} : { "Origin": origin, "Referer": origin })
  };
}

async function handleExtraction(url: string, format: ProxyFormat, className?: string, idName?: string): Promise<ApiResponse<ProxyResponse>> {
  const startTime = Date.now();
  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch (e) {
    return { success: false, error: 'Invalid Target URL' };
  }

  // Validate selectors for specific formats
  if ((format === 'class' && !className) || (format === 'id' && !idName)) {
    return { success: false, error: `Selector required for format: ${format}` };
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: getBrowserHeaders(targetUrl.toString()),
      redirect: 'follow'
    });
    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();
    const result: ProxyResponse = {
      url: targetUrl.toString(),
      format,
      status: {
        url: targetUrl.toString(),
        content_type: contentType,
        http_code: response.status,
        response_time_ms: Date.now() - startTime
      },
      images: [],
      links: [],
      videos: [],
      extractedElements: []
    };
    if (contentType.includes("text/html")) {
      const images = new Set<string>();
      const links = new Set<string>();
      const videos = new Set<string>();
      const elements: ExtractedElement[] = [];
      let titleText = "";
      const rewriter = new HTMLRewriter()
        .on('title', { text(t) { titleText += t.text; } })
        .on('img', {
          element(e) {
            const src = e.getAttribute('src');
            if (src) try { images.add(new URL(src, targetUrl).href); } catch { /* ignore */ }
          }
        })
        .on('a', {
          element(e) {
            const href = e.getAttribute('href');
            if (href && !href.startsWith('#')) try { links.add(new URL(href, targetUrl).href); } catch { /* ignore */ }
          }
        })
        .on('video, source', {
          element(e) {
            const src = e.getAttribute('src');
            if (src) try { videos.add(new URL(src, targetUrl).href); } catch { /* ignore */ }
          }
        });
      if (format === 'class' && className) {
        rewriter.on(`.${className}`, {
          element(e) {
            const el: ExtractedElement = { tag: e.tagName, attrs: {}, innerText: "", innerHTML: "" };
            for (const [name, value] of e.attributes) el.attrs[name] = value;
            elements.push(el);
          }
        });
      } else if (format === 'id' && idName) {
        rewriter.on(`#${idName}`, {
          element(e) {
            const el: ExtractedElement = { tag: e.tagName, attrs: {}, innerText: "", innerHTML: "" };
            for (const [name, value] of e.attributes) el.attrs[name] = value;
            elements.push(el);
          }
        });
      }
      await rewriter.transform(new Response(rawBody)).text();
      result.title = titleText.replace(/\s+/g, ' ').trim();
      result.images = Array.from(images);
      result.links = Array.from(links);
      result.videos = Array.from(videos);
      result.extractedElements = elements;
      if (format === 'text') {
        result.text = rawBody.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
                            .replace(/<[^>]*>?/gm, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
      }
    }
    // Always return full structure for consistency in the response window
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Upstream fetch failed' };
  }
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/proxy', async (c) => {
    const url = c.req.query('url');
    if (!url) return c.json({ success: false, error: 'URL required' }, 400);
    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: 'follow' });
      const headers = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
      headers.set("X-Proxied-By", "FluxGate/2.1");
      headers.set("X-Proxy-Mode", "Streaming");
      return new Response(response.body, { status: response.status, headers });
    } catch (e) {
      return c.json({ success: false, error: 'Fetch failed' }, 502);
    }
  });
  const formats: ProxyFormat[] = ['json', 'text', 'images', 'links', 'videos', 'class', 'id'];
  formats.forEach(f => {
    app.get(`/api/${f}`, async (c) => {
      const url = c.req.query('url');
      if (!url) return c.json({ success: false, error: 'URL required' }, 400);
      const className = c.req.query('class');
      const idName = c.req.query('id');
      const result = await handleExtraction(url, f, className, idName);
      if (!result.success) {
        return c.json(result, 400);
      }
      return c.json(result);
    });
  });
}