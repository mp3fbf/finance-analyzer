import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Finance Analyzer
        </h1>
        <p className="text-gray-600 mb-8">
          Analisador Financeiro Inteligente
        </p>
        <Link
          href="/upload"
          className="inline-block px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors"
        >
          Fazer Upload de Extrato
        </Link>
      </div>
    </div>
  );
}
