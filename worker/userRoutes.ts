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
    // "Host": host, // REMOVED: Caused 1016 errors in some CF Worker environments
    ...(!origin || origin === 'null' ? {} : { "Origin": origin, "Referer": origin })
  };
}


// Helper to detect JS redirects like window.location = "..."
function detectJSRedirect(html: string): string | null {
  // Pattern 1: window.location.href = 'url'
  const match1 = html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
  if (match1) return match1[1];

  // Pattern 2: window.location = 'url'
  const match2 = html.match(/window\.location\s*=\s*["']([^"']+)["']/);
  if (match2) return match2[1];

  // Pattern 3: content="0;url=..." (Meta refresh)
  const match3 = html.match(/content=["']\d*;\s*url=([^"']+)["']/i);
  if (match3) return match3[1];
  
  return null;
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
    let response = await fetch(targetUrl.toString(), {
      headers: getBrowserHeaders(targetUrl.toString()),
      redirect: 'follow'
    });

    let rawBody = await response.text();
    let contentType = response.headers.get("content-type") || "";

    // Automatic Redirect Following (Max 2 hops to prevent loops)
    let hops = 0;
    while (contentType.includes("text/html") && hops < 2) {
      const redirectLink = detectJSRedirect(rawBody);
      if (!redirectLink) break;
      
      let nextUrlStr = redirectLink;
      try {
        if (!nextUrlStr.startsWith('http')) {
           nextUrlStr = new URL(nextUrlStr, targetUrl).toString();
        }
        targetUrl = new URL(nextUrlStr); // Update current target
        
        console.log(`[Auto-Redirect] Following JS redirect to: ${targetUrl.toString()}`);
        const nextRes = await fetch(targetUrl.toString(), {
          headers: getBrowserHeaders(targetUrl.toString()),
          redirect: 'follow'
        });
        
        rawBody = await nextRes.text();
        contentType = nextRes.headers.get("content-type") || "";
        response = nextRes; // Update reference for status codes etc.
        hops++;
      } catch (e) {
        break; // Stop if URL processing fails
      }
    }

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
      let targetUrl = url;
      try {
         // pre-validation
         new URL(targetUrl);
      } catch(e) { return c.json({ success: false, error: 'Invalid URL' }, 400); }

      let response = await fetch(targetUrl, { 
        headers: getBrowserHeaders(targetUrl), 
        redirect: 'follow' 
      });
      
      let rawBody = await response.text();
      let contentType = response.headers.get("content-type") || "";

      // Cookie Jar for manual redirect following
      let cookies = response.headers.get("set-cookie") || "";

      // Only follow JS redirects if it is HTML
      let hops = 0;
      while (contentType.includes("text/html") && hops < 3) {
          const redirectLink = detectJSRedirect(rawBody);
          if (!redirectLink) break;
          
          let nextUrlStr = redirectLink;
          try {
            if (!nextUrlStr.startsWith('http')) {
               nextUrlStr = new URL(nextUrlStr, targetUrl).toString();
            }
            targetUrl = nextUrlStr;
            
            console.log(`[Auto-Redirect] Following JS redirect to: ${targetUrl}`);
            
            const nextHeaders = getBrowserHeaders(targetUrl);
            if (cookies) nextHeaders["Cookie"] = cookies; // Forward cookies

            const nextRes = await fetch(targetUrl, {
              headers: nextHeaders,
              redirect: 'follow'
            });
            
            // Append new cookies if any (simple merge)
            const newCookies = nextRes.headers.get("set-cookie");
            if (newCookies) cookies = cookies ? `${cookies}; ${newCookies}` : newCookies;

            rawBody = await nextRes.text();
            contentType = nextRes.headers.get("content-type") || "";
            response = nextRes;
            hops++;
          } catch (e) {
            break;
          }
      }

      // Handle HTML vs JSON vs Other
      if (contentType.includes("application/json")) {
        return c.newResponse(rawBody, {
          status: response.status,
          headers: response.headers
        });
      }

      const headers = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
      headers.set("Content-Type", contentType); // Ensure content type is preserved
      return c.body(rawBody, { status: response.status, headers });
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