import Link from 'next/link'
import Image from 'next/image'

export function SiteHeader() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/logos/black_logo_full.png"
            alt="LeAI Logo"
            width={140}
            height={44}
            priority
            className="h-8 md:h-11 w-auto"
          />
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          <Link href="/#features" className="text-sm font-medium text-gray-700 hover:bg-[#2728D2] hover:text-white transition-all px-3 py-2 rounded-lg">Features</Link>
          <Link href="/#how-it-works" className="text-sm font-medium text-gray-700 hover:bg-[#2728D2] hover:text-white transition-all px-3 py-2 rounded-lg">How It Works</Link>
          <Link href="/pricing" className="text-sm font-medium text-gray-700 hover:bg-[#2728D2] hover:text-white transition-all px-3 py-2 rounded-lg">Pricing</Link>
          <Link href="/contact" className="text-sm font-medium text-gray-700 hover:bg-[#2728D2] hover:text-white transition-all px-3 py-2 rounded-lg">Contact</Link>
        </div>
        <div className="flex gap-3 items-center">
          <Link href="/auth/login" className="px-5 py-2.5 text-sm font-semibold text-black hover:text-gray-700 transition-colors">
            Sign In
          </Link>
          <Link href="/auth/signup" className="px-6 py-2.5 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-900 transition-all shadow-sm hover:shadow-md">
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>
  )
}
