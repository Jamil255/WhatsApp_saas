import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { CopyCodeButton } from "@/components/copy-code-button";
import { DocsToc } from "@/components/docs-toc";
import { docsArticles, type DocsArticle, type DocsEndpoint } from "@/lib/docs-content";

function CodeBlock({ label, value }: { label: string; value: string }) {
  return <div className="docs-code"><div className="docs-code-head"><span>{label}</span><CopyCodeButton value={value} /></div><pre><code>{value}</code></pre></div>;
}

function Endpoint({ endpoint }: { endpoint: DocsEndpoint }) {
  const authHeaders = endpoint.auth === "Bearer token" ? '  -H "Authorization: Bearer $ACCESS_TOKEN"' : endpoint.auth === "API credentials" ? '  -H "X-Client-Id: $NEXORA_CLIENT_ID" \\\n  -H "X-Api-Secret: $NEXORA_API_SECRET"' : "";
  const requestPath = endpoint.path.replace("{id}", "$TEMPLATE_ID");
  const request = `curl -X ${endpoint.method} "$API_BASE_URL${requestPath}"${authHeaders ? " \\\n" + authHeaders : ""}${endpoint.body ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${endpoint.body}'` : ""}`;
  return <div className="docs-endpoint"><div className="docs-endpoint-head"><span className={`docs-method method-${endpoint.method.toLowerCase()}`}>{endpoint.method}</span><code>{endpoint.path}</code></div><p>{endpoint.description}</p><div className="docs-auth"><strong>Authentication</strong><span>{endpoint.auth}{endpoint.auth === "Bearer token" && endpoint.path.startsWith("/api/admin") ? " · SUPER_ADMIN" : ""}</span></div>{endpoint.fields && <div className="docs-fields"><strong>Request fields</strong><ul>{endpoint.fields.map((field) => <li key={field}>{field}</li>)}</ul></div>}<div className="docs-example-grid"><CodeBlock label="Request · cURL" value={request} /><CodeBlock label={`Response · ${endpoint.status}`} value={endpoint.response} /></div>{endpoint.note && <p className="docs-note">{endpoint.note}</p>}</div>;
}

export function DocsArticleView({ article }: { article: DocsArticle }) {
  const index = docsArticles.findIndex((item) => item.slug === article.slug);
  const previous = docsArticles[index - 1];
  const next = docsArticles[index + 1];
  return <article className="docs-article"><DocsToc sections={article.sections.map(({ id, title }) => ({ id, title }))} /><nav aria-label="Breadcrumb" className="docs-breadcrumb"><Link href="/docs">Docs</Link><ChevronRight className="h-3.5 w-3.5" /><span>{article.title}</span></nav><div className="docs-eyebrow">{article.group}</div><h1>{article.title}</h1><p className="docs-lead">{article.description}</p>{article.sections.map((section) => <section id={section.id} className="docs-section" key={section.id}><h2>{section.title}</h2><p>{section.description}</p>{section.points && <ul className="docs-points">{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}{section.code && <CodeBlock {...section.code} />}{section.endpoint && <Endpoint endpoint={section.endpoint} />}</section>)}<div className="docs-pager">{previous ? <Link href={`/docs/${previous.slug}`}><ArrowLeft className="h-4 w-4" /><span><small>Previous</small><strong>{previous.title}</strong></span></Link> : <span />}{next ? <Link href={`/docs/${next.slug}`}><span><small>Next</small><strong>{next.title}</strong></span><ArrowRight className="h-4 w-4" /></Link> : <span />}</div></article>;
}
