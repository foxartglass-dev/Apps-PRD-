import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { loadConfig, saveConfig, RuntimeConfig } from '../config/runtime';

type TestResult = { status: 'idle' | 'testing' | 'pass' | 'fail'; message?: string };

export function SettingsDrawer({ isOpen, onClose, onConfigChange }: { isOpen: boolean; onClose: () => void; onConfigChange: (c: RuntimeConfig) => void }) {
  const [config, setConfig] = useState<RuntimeConfig>(loadConfig());
  const [activeTab, setActiveTab] = useState<'runtime' | 'backends'>('runtime');
  const [showSaveToast, setShowSaveToast] = useState(false);

  const [testServerResult, setTestServerResult] = useState<TestResult>({ status: 'idle' });
  const [testStudioResult, setTestStudioResult] = useState<TestResult>({ status: 'idle' });

  useEffect(() => {
    setConfig(loadConfig());
    setTestServerResult({ status: 'idle' });
    setTestStudioResult({ status: 'idle' });
  }, [isOpen]);

  const handleConfigFieldChange = (field: keyof RuntimeConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const newConfig = saveConfig(config);
    onConfigChange(newConfig);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleStudioModeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    const newConfig = { ...config, studioMode: isEnabled };
    setConfig(newConfig); // Update local state for instant UI feedback
    const saved = saveConfig(newConfig); // Persist to localStorage
    onConfigChange(saved); // Propagate change up to parent
  };

  const onTestServer = async () => {
    setTestServerResult({ status: 'testing' });
    try {
      const r = await fetch('/api/health');
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `Server health check failed with status ${r.status}`);
      setTestServerResult({ status: 'pass', message: `OK: model=${j.model}` });
    } catch (e: any) {
      setTestServerResult({ status: 'fail', message: e.message });
    }
  };

  const onTestStudio = async () => {
    setTestStudioResult({ status: 'testing' });
    try {
        // In AI Studio, the API key is automatically provided via process.env.API_KEY.
        // The window.aistudio.hasSelectedApiKey() check is for specific APIs (like Veo) and not needed here.
        if (!process.env.API_KEY) {
            throw new Error("API key not found in environment. Please ensure it's configured in AI Studio.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'ping' });
        if (response.text?.trim()) {
            setTestStudioResult({ status: 'pass', message: `OK: ${response.text.trim()}` });
        } else {
            throw new Error('Empty response from model.');
        }
    } catch (e: any) {
        let message = e.message;
        if (message.includes("API key not valid")) {
            message = "The provided API key is not valid. Please check your AI Studio project configuration and ensure the Gemini API is enabled.";
        }
        setTestStudioResult({ status: 'fail', message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}>
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background text-text-primary shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>
        <div className="border-b border-border">
          <nav className="flex">
            <button onClick={() => setActiveTab('runtime')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'runtime' ? 'border-b-2 border-primary text-text-primary' : 'text-text-secondary'}`}>Runtime</button>
            <button onClick={() => setActiveTab('backends')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'backends' ? 'border-b-2 border-primary text-text-primary' : 'text-text-secondary'}`}>Backends</button>
          </nav>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-6">
          {activeTab === 'runtime' && (
            <div>
              <h3 className="font-semibold mb-2">Runtime Configuration</h3>
              <div className="p-3 border border-border rounded-lg space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Studio Mode <span className="text-xs text-text-secondary">(override with local settings)</span></span>
                  <input type="checkbox" checked={config.studioMode} onChange={handleStudioModeToggle} className="toggle-switch" />
                </label>
                <div className="flex gap-2">
                  <button onClick={onTestStudio} className="text-sm px-3 py-1.5 rounded border flex-1">Test Studio</button>
                  <button onClick={onTestServer} className="text-sm px-3 py-1.5 rounded border flex-1">Test Server</button>
                </div>
                <TestResultDisplay result={testStudioResult} />
                <TestResultDisplay result={testServerResult} />
              </div>
            </div>
          )}
          {activeTab === 'backends' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Backend Services <span className="text-xs text-text-secondary">(for deployment)</span></h3>
              <p className="text-xs text-text-secondary">These settings are saved locally and only used when Studio Mode is ON.</p>
              
              <details className="space-y-2 border border-border rounded-lg p-3" open>
                <summary className="font-medium text-sm cursor-pointer">Supabase</summary>
                <ConfigInput label="Supabase URL" value={config.supabaseUrl || ''} onChange={e => handleConfigFieldChange('supabaseUrl', e.target.value)} />
                <ConfigInput label="Supabase Anon Key" value={config.supabaseAnonKey || ''} onChange={e => handleConfigFieldChange('supabaseAnonKey', e.target.value)} />
              </details>
              
              <details className="space-y-2 border border-border rounded-lg p-3">
                <summary className="font-medium text-sm cursor-pointer">Square</summary>
                <ConfigInput label="Square App ID" value={config.squareAppId || ''} onChange={e => handleConfigFieldChange('squareAppId', e.target.value)} />
                <ConfigInput label="Square Location ID" value={config.squareLocationId || ''} onChange={e => handleConfigFieldChange('squareLocationId', e.target.value)} />
              </details>
              
              <details className="space-y-2 border border-border rounded-lg p-3">
                <summary className="font-medium text-sm cursor-pointer">Auth</summary>
                <ConfigInput label="Google Client ID" value={config.authGoogleClientId || ''} onChange={e => handleConfigFieldChange('authGoogleClientId', e.target.value)} />
                <ConfigInput label="Google Client Secret" value={config.authGoogleClientSecret || ''} onChange={e => handleConfigFieldChange('authGoogleClientSecret', e.target.value)} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.authEmailEnabled} onChange={e => handleConfigFieldChange('authEmailEnabled', e.target.checked)} /> Email Enabled</label>
              </details>

              <div>
                <h4 className="font-semibold text-sm mb-2">Readiness</h4>
                <div className="flex flex-wrap gap-2">
                    <Badge label="Supabase" ready={!!(config.supabaseUrl && config.supabaseAnonKey)} />
                    <Badge label="Square" ready={!!(config.squareAppId && config.squareLocationId)} />
                    <Badge label="Auth: Google" ready={!!(config.authGoogleClientId && config.authGoogleClientSecret)} />
                    <Badge label="Auth: Email" ready={!!config.authEmailEnabled} />
                </div>
              </div>

            </div>
          )}
        </div>
        {activeTab === 'backends' && (
          <div className="p-4 border-t border-border flex justify-end items-center gap-4">
            {showSaveToast && <span className="text-sm text-secondary">Saved!</span>}
            <button onClick={handleSave} className="px-4 py-2 text-sm rounded bg-primary text-white">Save Changes</button>
          </div>
        )}
      </div>
       <style>{`
        .toggle-switch { appearance: none; width: 36px; height: 20px; background: #374151; border-radius: 10px; position: relative; cursor: pointer; transition: background .3s; }
        .toggle-switch::before { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform .3s; }
        .toggle-switch:checked { background: #4f46e5; }
        .toggle-switch:checked::before { transform: translateX(16px); }
      `}</style>
    </div>
  );
}

const ConfigInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block text-sm">
    <span className="text-text-secondary mb-1 block">{label}</span>
    <input type="text" {...props} className="w-full bg-background border border-border rounded p-1.5 text-text-primary" />
  </label>
);

const Badge = ({ label, ready }: { label: string, ready: boolean }) => (
    <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1.5 ${ready ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-700'}`}>
        <div className={`w-2 h-2 rounded-full ${ready ? 'bg-green-600' : 'bg-gray-500'}`}></div>
        {label}: <span className="font-semibold">{ready ? 'configured' : 'missing'}</span>
    </div>
);

const TestResultDisplay = ({ result }: { result: TestResult }) => {
    if (result.status === 'idle') return null;
    const colors = { testing: 'text-yellow-400', pass: 'text-green-400', fail: 'text-red-400' };
    return (
        <div className={`text-xs p-2 rounded bg-surface ${colors[result.status]}`}>
            {result.status === 'testing' && 'Testing...'}
            {result.status === 'pass' && `PASS: ${result.message}`}
            {result.status === 'fail' && `FAIL: ${result.message}`}
        </div>
    );
};