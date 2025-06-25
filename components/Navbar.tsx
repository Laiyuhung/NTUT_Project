'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-xl font-bold">
              🌤️ 氣象資料系統
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            <Link 
              href="/" 
              className="hover:text-blue-200 transition-colors duration-200 font-medium"
            >
              首頁
            </Link>
            <Link 
              href="/upload/photo" 
              className="hover:text-blue-200 transition-colors duration-200 font-medium"
            >
              照片上傳
            </Link>
            <Link 
              href="/upload/csv" 
              className="hover:text-blue-200 transition-colors duration-200 font-medium"
            >
              CSV上傳
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-white hover:text-blue-200 focus:outline-none focus:text-blue-200 transition-colors duration-200"
              aria-label="開啟選單"
            >
              <svg 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                ) : (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-blue-700 rounded-lg mt-2 mb-2">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                href="/" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-800 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                首頁
              </Link>
              <Link 
                href="/upload/photo" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-800 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                照片上傳
              </Link>
              <Link 
                href="/upload/csv" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-800 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                CSV上傳
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
