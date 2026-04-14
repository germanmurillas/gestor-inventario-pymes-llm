import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

export default function Welcome() {
    return (
        <div className="min-h-screen bg-[#F3F4F6] text-[#111111] font-sans">
            <Head title="Pymetory | Inicio" />

            {/* Figma Mockup 1 Header */}
            <nav className="bg-white border-b border-gray-200 py-4 px-8 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-1">
                            <div className="w-8 h-8 flex items-center justify-center font-bold text-xl">
                                <span className="rotate-[-10deg]">P</span>
                            </div>
                        </div>
                        <div className="hidden lg:flex gap-6 text-sm font-medium text-gray-600">
                            <a href="#" className="hover:text-black transition-colors">Products</a>
                            <a href="#" className="hover:text-black transition-colors">Solutions</a>
                            <a href="#" className="hover:text-black transition-colors">Community</a>
                            <a href="#" className="hover:text-black transition-colors">Resources</a>
                            <a href="#" className="hover:text-black transition-colors">Pricing</a>
                            <a href="#" className="hover:text-black transition-colors">Contact</a>
                            <a href="#" className="hover:text-black transition-colors">Link</a>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/login" className="px-5 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors">Sign in</Link>
                        <Link href="/register" className="px-5 py-2 text-sm font-medium bg-[#111111] text-white rounded-md hover:opacity-90 transition-opacity">Register</Link>
                    </div>
                </div>
            </nav>

            {/* Main Content (Mockup 1 center) */}
            <main className="max-w-4xl mx-auto py-20 px-6 space-y-12">
                
                {/* Hero Section Card 1 */}
                <div className="bg-white border border-gray-200 rounded-lg p-10 flex flex-col md:flex-row gap-10 items-center shadow-sm">
                    <div className="w-full md:w-48 h-48 bg-[#E5E7EB] rounded flex items-center justify-center">
                        <div className="opacity-20">
                            {/* Placeholder icon */}
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                    </div>
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <h1 className="text-3xl font-extrabold tracking-tight">Title</h1>
                        <p className="text-gray-500 leading-relaxed">
                            Body text for whatever you'd like to say. Add main takeaway points, quotes, anecdotes, or even a very very short story.
                        </p>
                        <button className="bg-[#E5E7EB] text-gray-700 px-6 py-2 rounded font-bold hover:bg-[#D1D5DB] transition-colors border border-gray-300">
                            Button
                        </button>
                    </div>
                </div>

                {/* Hero Section Card 2 */}
                <div className="bg-white border border-gray-200 rounded-lg p-10 flex flex-col md:flex-row gap-10 items-center shadow-sm">
                    <div className="w-full md:w-48 h-48 bg-[#E5E7EB] rounded flex items-center justify-center">
                        <div className="opacity-20">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                    </div>
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <h2 className="text-3xl font-extrabold tracking-tight">Title</h2>
                        <p className="text-gray-500 leading-relaxed">
                            Body text for whatever you'd like to say. Add main takeaway points, quotes, anecdotes, or even a very very short story.
                        </p>
                        <button className="bg-[#E5E7EB] text-gray-700 px-6 py-2 rounded font-bold hover:bg-[#D1D5DB] transition-colors border border-gray-300">
                            Button
                        </button>
                    </div>
                </div>

            </main>

            {/* Footer (Mockup 1 Bottom) */}
            <footer className="bg-white border-t border-gray-200 py-20 px-8 mt-20">
                <div className="max-w-7xl mx-auto flex flex-col items-center">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-12 w-full text-sm">
                        
                        {/* Column Brand */}
                        <div className="space-y-6">
                            <div className="font-bold text-2xl">P</div>
                            <div className="flex gap-4 opacity-70">
                                <span className="hover:opacity-100 cursor-pointer">𝕏</span>
                                <span className="hover:opacity-100 cursor-pointer">📷</span>
                                <span className="hover:opacity-100 cursor-pointer">▶️</span>
                                <span className="hover:opacity-100 cursor-pointer">💼</span>
                            </div>
                        </div>

                        {/* Col 2 */}
                        <div className="space-y-4">
                            <h4 className="font-bold">Use cases</h4>
                            <ul className="space-y-2 text-gray-500">
                                <li>UI design</li>
                                <li>UX design</li>
                                <li>Wireframing</li>
                                <li>Diagramming</li>
                                <li>Brainstorming</li>
                                <li>Online whiteboard</li>
                                <li>Team collaboration</li>
                            </ul>
                        </div>

                        {/* Col 3 */}
                        <div className="space-y-4">
                            <h4 className="font-bold">Explore</h4>
                            <ul className="space-y-2 text-gray-500">
                                <li>Design</li>
                                <li>Prototyping</li>
                                <li>Development features</li>
                                <li>Design systems</li>
                                <li>Collaboration features</li>
                                <li>Design process</li>
                                <li>FigJam</li>
                            </ul>
                        </div>

                        {/* Col 4 */}
                        <div className="space-y-4">
                            <h4 className="font-bold">Resources</h4>
                            <ul className="space-y-2 text-gray-500">
                                <li>Blog</li>
                                <li>Best practices</li>
                                <li>Colors</li>
                                <li>Color wheel</li>
                                <li>Support</li>
                                <li>Developers</li>
                                <li>Resource library</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </footer>
        </div>
    );
}
