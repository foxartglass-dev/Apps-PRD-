
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Product } from '../../types';

interface ProductPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    onUpdate: (updates: Partial<Product>) => void;
}

const ProductPlanModal: React.FC<ProductPlanModalProps> = ({ isOpen, onClose, product, onUpdate }) => {
    const [mission, setMission] = useState(product.mission || '');
    const [targetUsers, setTargetUsers] = useState(product.targetUsers || '');
    const [coreProblem, setCoreProblem] = useState(product.coreProblem || '');
    const [roadmapMvp, setRoadmapMvp] = useState(product.roadmap?.mvp || '');
    const [roadmapNext, setRoadmapNext] = useState(product.roadmap?.next || '');
    const [roadmapLater, setRoadmapLater] = useState(product.roadmap?.later || '');
    const [techPreferences, setTechPreferences] = useState(product.techPreferences || '');

    useEffect(() => {
        if(isOpen) {
            setMission(product.mission || '');
            setTargetUsers(product.targetUsers || '');
            setCoreProblem(product.coreProblem || '');
            setRoadmapMvp(product.roadmap?.mvp || '');
            setRoadmapNext(product.roadmap?.next || '');
            setRoadmapLater(product.roadmap?.later || '');
            setTechPreferences(product.techPreferences || '');
        }
    }, [isOpen, product]);

    const handleSave = () => {
        onUpdate({
            mission,
            targetUsers,
            coreProblem,
            roadmap: {
                mvp: roadmapMvp,
                next: roadmapNext,
                later: roadmapLater,
            },
            techPreferences
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Product Plan: ${product.name}`} size="xl" footer={
            <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave}>Save Changes</Button>
            </>
        }>
            <div className="space-y-6">
                <TextAreaGroup label="Mission" value={mission} onChange={e => setMission(e.target.value)} rows={3} />
                <TextAreaGroup label="Target Users" value={targetUsers} onChange={e => setTargetUsers(e.target.value)} rows={3} />
                <TextAreaGroup label="Core Problem & Outcomes" value={coreProblem} onChange={e => setCoreProblem(e.target.value)} rows={4} />
                <div>
                    <h4 className="text-lg font-semibold mb-2">Roadmap</h4>
                    <div className="space-y-4">
                        <TextAreaGroup label="MVP" value={roadmapMvp} onChange={e => setRoadmapMvp(e.target.value)} rows={4} />
                        <TextAreaGroup label="Next" value={roadmapNext} onChange={e => setRoadmapNext(e.target.value)} rows={4} />
                        <TextAreaGroup label="Later" value={roadmapLater} onChange={e => setRoadmapLater(e.target.value)} rows={4} />
                    </div>
                </div>
                <TextAreaGroup label="Tech Preferences" value={techPreferences} onChange={e => setTechPreferences(e.target.value)} rows={4} />
            </div>
        </Modal>
    );
};

const TextAreaGroup: React.FC<{ label: string, value: string, onChange: React.ChangeEventHandler<HTMLTextAreaElement>, rows?: number }> = ({ label, value, onChange, rows=2 }) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            rows={rows}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:ring-primary focus:border-primary"
        />
    </div>
);

export default ProductPlanModal;
