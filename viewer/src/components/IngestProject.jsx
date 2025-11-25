import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Folder, Terminal, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ingestProject } from '../lib/api';

export default function IngestProject() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('repo'); // 'repo' or 'path'
    const [source, setSource] = useState('');
    const [name, setName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('idle'); // idle, processing, complete, error
    const logsEndRef = useRef(null);
    const wsRef = useRef(null);

    useEffect(() => {
        // Scroll to bottom of logs
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const connectWebSocket = () => {
        const clientId = Date.now();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs/${clientId}`);

        ws.onopen = () => {
            console.log('Connected to log stream');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'log') {
                setLogs(prev => [...prev, data.message]);
            } else if (data.type === 'status') {
                setStatus(data.status);
                if (data.message) {
                    setLogs(prev => [...prev, `[STATUS] ${data.message}`]);
                }
                if (data.status === 'complete' || data.status === 'error') {
                    setIsProcessing(false);
                    // Close connection after a short delay to ensure all logs are received
                    setTimeout(() => ws.close(), 1000);
                }
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setLogs(prev => [...prev, '[ERROR] Connection to log stream failed']);
        };

        wsRef.current = ws;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!source) return;

        setIsProcessing(true);
        setLogs([]);
        setStatus('processing');

        // Connect to WebSocket before starting ingestion
        connectWebSocket();

        try {
            await ingestProject({
                type: mode,
                source: source,
                name: name || undefined
            });
        } catch (error) {
            console.error('Ingestion failed to start:', error);
            setStatus('error');
            setLogs(prev => [...prev, `[ERROR] Failed to start ingestion: ${error.message}`]);
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-8">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-gray-600 hover:text-blue-600 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Projects
                </button>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Project</h1>
                        <p className="text-gray-500">Import a GitHub repository or local directory to generate documentation.</p>
                    </div>

                    <div className="p-8">
                        {/* Mode Selection */}
                        <div className="flex space-x-4 mb-8">
                            <button
                                onClick={() => setMode('repo')}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center space-x-3 transition-all ${mode === 'repo'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-blue-200 text-gray-600'
                                    }`}
                            >
                                <Github className="w-6 h-6" />
                                <span className="font-semibold">GitHub Repository</span>
                            </button>
                            <button
                                onClick={() => setMode('path')}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center space-x-3 transition-all ${mode === 'path'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-blue-200 text-gray-600'
                                    }`}
                            >
                                <Folder className="w-6 h-6" />
                                <span className="font-semibold">Local Directory</span>
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {mode === 'repo' ? 'Repository URL' : 'Directory Path'}
                                </label>
                                <input
                                    type="text"
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                    placeholder={mode === 'repo' ? 'https://github.com/username/repo' : '/path/to/your/project'}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    disabled={isProcessing}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Project Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My Awesome Project"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    disabled={isProcessing}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessing || !source}
                                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 transition-all ${isProcessing
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-200'
                                    }`}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Terminal className="w-6 h-6" />
                                        <span>Start Ingestion</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Logs Area */}
                        {(logs.length > 0 || status !== 'idle') && (
                            <div className="mt-8">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Process Logs</h3>
                                    {status === 'complete' && (
                                        <span className="flex items-center text-green-600 text-sm font-bold">
                                            <CheckCircle className="w-4 h-4 mr-1" /> Complete
                                        </span>
                                    )}
                                    {status === 'error' && (
                                        <span className="flex items-center text-red-600 text-sm font-bold">
                                            <AlertCircle className="w-4 h-4 mr-1" /> Failed
                                        </span>
                                    )}
                                </div>
                                <div className="bg-gray-900 rounded-xl p-4 h-64 overflow-y-auto font-mono text-sm text-gray-300 shadow-inner">
                                    {logs.map((log, index) => (
                                        <div key={index} className="mb-1 break-all">
                                            <span className="text-gray-500 mr-2">$</span>
                                            {log}
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                        )}

                        {status === 'complete' && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-green-200 transition-all"
                                >
                                    View Projects
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
