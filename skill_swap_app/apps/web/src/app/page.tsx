import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-5xl font-bold text-gray-900">SkillSwap</h1>
        <p className="text-xl text-gray-500">Trade skills, not money.</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-in"
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  )
}
