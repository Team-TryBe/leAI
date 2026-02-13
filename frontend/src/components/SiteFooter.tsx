import Link from 'next/link'
import Image from 'next/image'

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <div className="mb-4">
              <Image
                src="/logos/black_icon_final.png"
                alt="LeAI Icon"
                width={48}
                height={48}
                priority
                className="h-12 w-auto"
              />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">AI-powered career workflow automation for the Kenyan job market</p>
          </div>
          <div>
            <h4 className="font-bold text-black mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/#features" className="hover:text-black transition-colors">Features</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-black transition-colors">How It Works</Link></li>
              <li><Link href="/pricing" className="hover:text-black transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-black mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/about" className="hover:text-black transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-black transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-black mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><a href="#" className="hover:text-black transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-600">© 2026 LeAI. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-600">
            <a href="#" className="hover:text-black transition-colors">Twitter</a>
            <a href="#" className="hover:text-black transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-black transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
