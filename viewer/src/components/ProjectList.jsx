import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight, BookOpen, Download, Loader2, Code2 } from 'lucide-react';
import { getProjects, getMarkdown } from '../lib/api';
import html2pdf from 'html2pdf.js';
import ReactMarkdown from 'react-markdown';
import { renderToStaticMarkup } from 'react-dom/server';

export default function ProjectList() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [pdfError, setPdfError] = useState(null);

    useEffect(() => {
        getProjects()
            .then(setProjects)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const handleDownloadPDF = async (e, project) => {
        e.preventDefault();
        e.stopPropagation();

        if (downloadingId) return;
        setDownloadingId(project.id);
        setPdfError(null);

        try {
            const filePromises = project.files.map(async (file) => {
                const content = await getMarkdown(file.path);
                return { name: file.name, content };
            });

            const files = await Promise.all(filePromises);

            if (files.some(f => !f.content)) {
                throw new Error("Some files failed to load content.");
            }

            // Generate HTML content synchronously
            const contentHtml = files.map(file => {
                const markdownHtml = renderToStaticMarkup(
                    <div className="prose prose-slate max-w-none">
                        <ReactMarkdown>{file.content}</ReactMarkdown>
                    </div>
                );

                return `
                    <div class="chapter">
                        <h1 class="chapter-title">${file.name.replace('.md', '')}</h1>
                        <div class="markdown-body">
                            ${markdownHtml}
                        </div>
                    </div>
                `;
            }).join('');

            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${project.name} - Documentation</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; mx-auto; }
                        .chapter { page-break-before: always; margin-bottom: 40px; }
                        .chapter:first-child { page-break-before: avoid; }
                        .chapter-title { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
                        .markdown-body { line-height: 1.6; }
                        pre { background: #f1f5f9; padding: 15px; border-radius: 5px; overflow-x: auto; }
                        code { font-family: monospace; }
                        img { max-width: 100%; }
                        @media print {
                            body { padding: 0; }
                            @page { margin: 2cm; }
                        }
                    </style>
                </head>
                <body>
                    <div style="text-align: center; margin-bottom: 60px; padding-top: 50px;">
                        <h1 style="font-size: 48px; color: #1e293b; margin-bottom: 20px;">${project.name}</h1>
                        <p style="font-size: 18px; color: #64748b;">AI Generated Documentation</p>
                    </div>
                    ${contentHtml}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                // window.close(); // Keep open for debugging
                            }, 1000);
                        }
                    </script>
                </body>
                </html>
            `;

            console.log("Generated HTML Length:", fullHtml.length);
            console.log("First 500 chars of HTML:", fullHtml.substring(0, 500));

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                throw new Error("Popup blocked. Please allow popups for this site.");
            }
            printWindow.document.write(fullHtml);
            printWindow.document.close(); // Ensure document is closed for rendering to start

        } catch (err) {
            console.error('PDF generation failed:', err);
            setPdfError(err.toString());
            alert(`Failed to generate PDF: ${err.message}`);
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100">
                <div className="text-red-500 bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md text-center">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-gray-900">Unable to load projects</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            {pdfError && (
                <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-lg max-w-lg">
                    <strong className="font-bold">PDF Generation Error: </strong>
                    <span className="block sm:inline break-words">{pdfError}</span>
                    <button
                        onClick={() => setPdfError(null)}
                        className="absolute top-0 bottom-0 right-0 px-4 py-3"
                    >
                        <span className="text-red-500 font-bold">×</span>
                    </button>
                </div>
            )}
            {/* Hero Section */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center relative">
                    <div className="absolute top-8 right-8">
                        <Link
                            to="/ingest"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-all"
                        >
                            <Layers className="w-5 h-5 mr-2" />
                            Add Project
                        </Link>
                    </div>
                    <div className="inline-flex items-center justify-center p-2 bg-blue-50 rounded-2xl mb-6">
                        <Layers className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                        Knowledge Base
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                        Explore AI-generated documentation, tutorials, and deep dives into your codebases.
                    </p>
                </div>
            </div>

            {/* Grid Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            to={`/project/${project.id}`}
                            className="group bg-white rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full relative"
                        >
                            <div className="p-8 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-300">
                                        <Code2 className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={(e) => handleDownloadPDF(e, project)}
                                            disabled={downloadingId === project.id}
                                            className="inline-flex items-center justify-center p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Download as PDF"
                                        >
                                            {downloadingId === project.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Download className="w-5 h-5" />
                                            )}
                                        </button>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                            Generated
                                        </span>
                                    </div>
                                </div>

                                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                                    {project.name}
                                </h2>

                                <div className="mt-auto pt-6 flex items-center text-gray-500 text-sm font-medium space-x-4">
                                    <div className="flex items-center">
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        {project.files.length} Articles
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50/50 px-8 py-5 flex items-center justify-between text-sm font-semibold text-gray-600 border-t border-gray-100 group-hover:bg-indigo-50/50 group-hover:text-indigo-700 transition-colors">
                                <span>Explore Documentation</span>
                                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    ))}
                </div>

                {projects.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-6">
                            <Layers className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No projects found</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Run the generator script to create tutorials, then run <code className="bg-gray-100 px-2 py-1 rounded text-sm">python generate_manifest.py</code> to see them here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
