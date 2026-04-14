import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] text-[#111111] font-sans">
            <Head title="Iniciar Sesión | Pymetory" />

            {/* Figma Mockup Header Placeholder */}
            <nav className="bg-white border-b border-gray-200 py-4 px-8">
                <div className="max-w-7xl mx-auto flex justify-between items-center opacity-30 pointer-events-none">
                    <div className="flex items-center gap-8">
                        <div className="font-bold text-xl">P</div>
                        <div className="hidden lg:flex gap-6 text-sm">
                            <span>Products</span><span>Solutions</span><span>Community</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="px-4 py-1.5 border rounded opacity-50">Sign In</div>
                    </div>
                </div>
            </nav>

            <div className="flex items-center justify-center pt-24 pb-12 px-6">
                <div className="w-full max-w-[400px] bg-white p-10 rounded-lg border border-gray-200 shadow-sm">
                    {/* Login Form (Mockup 2) */}
                    <form onSubmit={submit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Email</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                placeholder="Value"
                                required
                            />
                            {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Password</label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                placeholder="Value"
                                required
                            />
                            {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
                        </div>

                        <button 
                            type="submit" 
                            disabled={processing}
                            className="w-full bg-[#111111] text-white py-3 rounded font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            Sign In
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="#" className="text-xs text-gray-500 hover:text-black hover:underline">Forgot password?</a>
                    </div>
                </div>
            </div>

            {/* Footer Placeholder */}
            <footer className="mt-20 border-t border-gray-200 bg-white py-12 px-8">
                <div className="max-w-7xl mx-auto flex justify-between items-center opacity-30 pointer-events-none">
                    <div className="font-bold">P</div>
                    <div className="flex gap-8 text-xs">
                        <span>Use cases</span><span>Explore</span><span>Resources</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
