import Link from 'next/link';
import { MARKETPLACE_PRODUCTS } from '@/lib/marketplace-products';
import ProductClient from './product-client';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  const productId = Number(id);
  const product = MARKETPLACE_PRODUCTS.find((item) => item.id === productId);

  if (!product) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900/60 via-emerald-700/50 to-lime-500/40 text-white">
        <section className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/20 bg-white/10 p-8 text-center shadow-[0_18px_40px_rgba(0,0,0,0.2)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-100">Product unavailable</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">We could not find this product.</h1>
            <p className="mt-3 text-white/90">
              The listing may have been moved or removed from the live catalog. Please return to the marketplace and try again.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/marketplace" className="inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_14px_34px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-yellow-300">
                Back to Marketplace
              </Link>
              <Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white">
                Go Home
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return <ProductClient product={product} />;
}
