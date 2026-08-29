import Web3LoginButton from '@/components/Web3LoginButton';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">PHCL Super Web3 Login</h1>
      <Web3LoginButton />
    </main>
  );
}
