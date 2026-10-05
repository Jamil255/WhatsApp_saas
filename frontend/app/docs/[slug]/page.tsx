import { notFound } from "next/navigation";
import { DocsArticleView } from "@/components/docs-article";
import { docsArticles, getDocsArticle } from "@/lib/docs-content";

export function generateStaticParams() { return docsArticles.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const article = getDocsArticle((await params).slug);
  return article ? { title: `${article.title} · Developer docs`, description: article.description } : {};
}
export default async function DocsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = getDocsArticle((await params).slug);
  if (!article) notFound();
  return <DocsArticleView article={article} />;
}
