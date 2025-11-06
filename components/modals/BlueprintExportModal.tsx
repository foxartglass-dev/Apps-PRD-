
import React, { useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Product } from '../../types';
import { downloadMarkdown } from '../../utils/fileUtils';

interface BlueprintExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const generateBlueprintText = (product: Product): string => {
    const p = (text?: string) => text || 'Not specified.';

    const featuresText = product.features.length > 0
        ? product.features.map(feature => `
### ${feature.id} – ${feature.name}
**Summary:** ${p(feature.summary)}
${feature.shapeSpec || "No Shape Spec yet."}
`).join('\n')
        : 'No features defined yet.';

    return `
# Product Blueprint – ${product.name}

## 0. Overview & Mission
${p(product.mission)}

## 1. Target Users
${p(product.targetUsers)}

## 2. Core Problem & Outcomes
${p(product.coreProblem)}

## 3. Roadmap

### MVP
${p(product.roadmap?.mvp)}

### Next
${p(product.roadmap?.next)}

### Later
${p(product.roadmap?.later)}

## 4. Tech Preferences
${p(product.techPreferences)}

## 5. Features
${featuresText}

## 6. Open Questions & Risks
(Placeholder for now; future version can aggregate from changeLog or a dedicated field.)
    `.trim();
};


const BlueprintExportModal: React.FC<BlueprintExportModalProps> = ({ isOpen, onClose, product }) => {
    const blueprintText = useMemo(() => generateBlueprintText(product), [product]);

    const handleCopy = () => {
        navigator.clipboard.writeText(blueprintText);
    };
    
    const handleDownload = () => {
        const filename = `${product.name.toLowerCase().replace(/\s+/g, '-')}-blueprint.md`;
        downloadMarkdown(blueprintText, filename);
    }

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Export Blueprint Text" 
            size="xl"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button variant="secondary" onClick={handleDownload}>Download .md</Button>
                    <Button onClick={handleCopy}>Copy to Clipboard</Button>
                </>
            }
        >
           <pre className="bg-background p-4 rounded-md h-[60vh] overflow-auto whitespace-pre-wrap font-mono text-sm text-text-secondary border border-border">
                <code>
                    {blueprintText}
                </code>
           </pre>
        </Modal>
    );
};

export default BlueprintExportModal;
