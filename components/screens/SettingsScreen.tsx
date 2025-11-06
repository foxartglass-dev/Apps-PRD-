
import React from 'react';
import { PromptTemplates } from '../../types';
import { DEFAULT_PROMPTS } from '../../constants';
import { Button } from '../common/Button';
import { downloadJson, uploadJson } from '../../utils/fileUtils';

interface SettingsScreenProps {
  prompts: PromptTemplates;
  onUpdatePrompts: (newPrompts: PromptTemplates) => void;
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ prompts, onUpdatePrompts, onBack }) => {

    const handlePromptChange = (key: keyof PromptTemplates, value: string) => {
        onUpdatePrompts({ ...prompts, [key]: value });
    };

    const handleReset = (key: keyof PromptTemplates) => {
        onUpdatePrompts({ ...prompts, [key]: DEFAULT_PROMPTS[key] });
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };
    
    const handleExport = () => {
        downloadJson(prompts, 'ideaspec-prompts.json');
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const importedPrompts = await uploadJson<PromptTemplates>(file);
                if (importedPrompts.brainDumpPrompt && importedPrompts.featureShapePrompt) {
                    onUpdatePrompts(importedPrompts);
                } else {
                    alert("Invalid prompt file format.");
                }
            } catch (e) {
                alert("Failed to import prompts.");
            }
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Button variant="ghost" onClick={onBack} className="mb-4">&larr; Back</Button>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-text-secondary mb-8">Customize the prompts used to interact with the AI model.</p>
            
            <div className="flex items-center justify-end gap-2 mb-8">
                 <input type="file" id="import-prompts" className="hidden" accept=".json" onChange={handleImport} />
                 <Button variant="ghost" onClick={() => document.getElementById('import-prompts')?.click()}>Import Prompts JSON</Button>
                 <Button variant="ghost" onClick={handleExport}>Export Prompts JSON</Button>
            </div>


            <div className="space-y-8">
                <PromptEditor 
                    title="Brain Dump Classification Prompt"
                    value={prompts.brainDumpPrompt}
                    onChange={(e) => handlePromptChange('brainDumpPrompt', e.target.value)}
                    onReset={() => handleReset('brainDumpPrompt')}
                    onCopy={() => handleCopy(prompts.brainDumpPrompt)}
                />
                <PromptEditor 
                    title="Feature Shape Spec Prompt"
                    value={prompts.featureShapePrompt}
                    onChange={(e) => handlePromptChange('featureShapePrompt', e.target.value)}
                    onReset={() => handleReset('featureShapePrompt')}
                    onCopy={() => handleCopy(prompts.featureShapePrompt)}
                />
            </div>
        </div>
    );
};

interface PromptEditorProps {
    title: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onReset: () => void;
    onCopy: () => void;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ title, value, onChange, onReset, onCopy }) => {
    return (
        <div className="bg-surface p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            <textarea
                value={value}
                onChange={onChange}
                className="w-full h-96 bg-background border border-border rounded-md p-4 font-mono text-sm text-text-secondary whitespace-pre-wrap"
            />
            <div className="flex items-center gap-2 mt-4">
                <Button variant="ghost" onClick={onReset}>Reset to Default</Button>
                <Button variant="ghost" onClick={onCopy}>Copy to Clipboard</Button>
            </div>
        </div>
    );
}

export default SettingsScreen;
