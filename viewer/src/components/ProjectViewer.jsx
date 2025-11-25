import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText, ChevronLeft, Menu, X, Home, Hash } from 'lucide-react';
import { getProjects, getMarkdown } from '../lib/api';
import Mermaid from './Mermaid';

export default function ProjectViewer() {
    const { id: projectId } = useParams();
    const [project, setProject] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        getProjects().then(projects => {
            const found = projects.find(p => p.id === projectId);
            if (found) {
                setProject(found);
                if (found.files.length > 0) {
                    setSelectedFile(found.files[0]);
                }
            }
            setLoading(false);
        });
    }, [projectId]);

    useEffect(() => {
        if (selectedFile) {
            getMarkdown(selectedFile.path).then(setContent);
        }
    }, [selectedFile]);

    const handleLinkClick = (href) => {
        if (!href) return;

        // Handle internal markdown links
        if (href.endsWith('.md')) {
            // Extract filename from path (e.g., "./02_config.md" -> "02_config.md")
            const targetName = href.split('/').pop();
            const targetFile = project?.files.find(f => f.name === targetName);

            if (targetFile) {
                setSelectedFile(targetFile);
                // Scroll to top
                const mainContent = document.querySelector('main');
                if (mainContent) mainContent.scrollTop = 0;
                return true; // Handled internally
            }
        }
        return false; // Let default behavior happen
    };

    const formatFileName = (name) => {
        return name
            .replace(/\.md$/, '')
            .replace(/^\d+_/, '') // Remove leading numbers like 01_
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!project) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
                <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">Return Home</Link>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Mobile Sidebar Overlay */}
            {!sidebarOpen && (
                <div className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(true)} />
            )}

            {/* Sidebar */}
            <div
                className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } fixed inset-y-0 left-0 z-30 w-80 bg-gradient-to-b from-sky-50 to-white border-r border-sky-100 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col shadow-xl lg:shadow-none`}
            >
                <div className="p-5 border-b border-sky-100/50 flex items-center justify-between bg-transparent">
                    <Link to="/" className="flex items-center text-slate-600 hover:text-sky-600 transition-colors group">
                        <div className="p-1.5 rounded-lg bg-white/50 group-hover:bg-white mr-2 transition-colors shadow-sm">
                            <ChevronLeft className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-sm">Back to Projects</span>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-white/50 text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 border-b border-sky-100/50 bg-transparent">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-200">
                            <span className="text-white font-bold text-lg">{project.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 break-words leading-tight">{project.name}</h2>
                    </div>
                    <p className="text-sm text-slate-500 font-medium pl-1">{project.files.length} documents available</p>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    {project.files.map((file) => (
                        <button
                            key={file.path}
                            onClick={() => {
                                setSelectedFile(file);
                                if (window.innerWidth < 1024) setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 group ${selectedFile?.path === file.path
                                ? 'bg-white text-sky-700 shadow-md shadow-sky-100 ring-1 ring-sky-100'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 hover:shadow-sm'
                                }`}
                        >
                            <FileText className={`w-4 h-4 mr-3 flex-shrink-0 transition-colors ${selectedFile?.path === file.path ? 'text-sky-500' : 'text-slate-400 group-hover:text-sky-500'
                                }`} />
                            <span className="truncate text-left">{formatFileName(file.name)}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white lg:bg-slate-50/50">
                <header className="h-16 border-b border-gray-200 lg:border-none flex items-center justify-between px-4 lg:px-8 bg-white lg:bg-transparent">
                    <div className="flex items-center">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 -ml-2 mr-3 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center text-slate-800">
                            <Hash className="w-5 h-5 text-sky-400 mr-2" />
                            <h1 className="text-lg font-bold truncate">
                                {selectedFile ? formatFileName(selectedFile.name) : 'Select a file'}
                            </h1>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 lg:p-12 min-h-[calc(100vh-8rem)]">
                        {selectedFile ? (
                            <article className="prose prose-slate prose-lg max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
                prose-h1:text-4xl prose-h1:mb-8 prose-h1:pb-4 prose-h1:border-b prose-h1:border-slate-100
                prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-slate-800
                prose-p:text-slate-600 prose-p:leading-relaxed
                prose-a:text-sky-600 prose-a:no-underline hover:prose-a:underline hover:prose-a:text-sky-700
                prose-code:bg-transparent prose-code:text-sky-600 prose-code:px-0 prose-code:py-0 prose-code:rounded-none prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-transparent prose-pre:p-0 prose-pre:shadow-none prose-pre:border-none
                prose-img:rounded-xl prose-img:shadow-md
                prose-blockquote:border-l-4 prose-blockquote:border-sky-500 prose-blockquote:bg-sky-50/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
              ">
                                <ReactMarkdown
                                    components={{
                                        a({ node, href, children, ...props }) {
                                            return (
                                                <a
                                                    href={href}
                                                    onClick={(e) => {
                                                        if (handleLinkClick(href)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    {...props}
                                                >
                                                    {children}
                                                </a>
                                            );
                                        },
                                        code({ node, inline, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || '')
                                            const language = match ? match[1] : ''

                                            if (!inline && language === 'mermaid') {
                                                return <Mermaid chart={String(children).replace(/\n$/, '')} />
                                            }

                                            return !inline && match ? (
                                                <div className="relative group my-6">
                                                    <div className="absolute right-4 top-4 text-xs font-mono text-slate-400 uppercase tracking-wider select-none z-10">
                                                        {language}
                                                    </div>
                                                    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
                                                        <SyntaxHighlighter
                                                            {...props}
                                                            style={vscDarkPlus}
                                                            language={language}
                                                            PreTag="div"
                                                            customStyle={{
                                                                margin: 0,
                                                                padding: '1.5rem',
                                                                fontSize: '0.9rem',
                                                                lineHeight: '1.6',
                                                                background: '#1e1e1e', // Ensure dark background
                                                            }}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    </div>
                                                </div>
                                            ) : (
                                                <code className={`${className} bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-md`} {...props}>
                                                    {children}
                                                </code>
                                            )
                                        }
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </article>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                                <FileText className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">Select a document to view its content</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
