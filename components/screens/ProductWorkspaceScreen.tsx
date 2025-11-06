
import React, { useState } from 'react';
import { Product, Feature, IdeaChunk } from '../../types';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import BrainDumpModal from '../modals/BrainDumpModal';
import FeatureDetailScreen from './FeatureDetailScreen';
import ProductPlanModal from '../modals/ProductPlanModal';
import BlueprintExportModal from '../modals/BlueprintExportModal';

interface ProductWorkspaceScreenProps {
  product: Product;
  onBack: () => void;
  onProcessBrainDump: (productId: string, text: string, title?: string, featureId?: string) => Promise<void>;
  onShapeFeature: (productId: string, featureId: string) => Promise<void>;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onUpdateFeature: (productId: string, featureId: string, updates: Partial<Feature>) => void;
  isLoading: boolean;
}

const ProductWorkspaceScreen: React.FC<ProductWorkspaceScreenProps> = ({
  product,
  onBack,
  onProcessBrainDump,
  onShapeFeature,
  onUpdateProduct,
  onUpdateFeature,
  isLoading,
}) => {
    const [isBrainDumpModalOpen, setIsBrainDumpModalOpen] = useState(false);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

    const selectedFeature = product.features.find(f => f.id === selectedFeatureId);

    const handleNewFeature = () => {
        const name = prompt("New feature name:");
        if (name) {
            const newFeature: Feature = {
                id: `feat_${Date.now()}`,
                productId: product.id,
                name,
                status: 'draft',
                ideaChunkIds: [],
            };
            onUpdateProduct(product.id, { features: [...product.features, newFeature] });
        }
    };
    
    if (selectedFeature) {
        return <FeatureDetailScreen 
                    feature={selectedFeature} 
                    product={product}
                    onBack={() => setSelectedFeatureId(null)}
                    onShapeFeature={onShapeFeature}
                    onUpdateFeature={onUpdateFeature}
                    isLoading={isLoading}
                />
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Button variant="ghost" onClick={onBack} className="mb-4">
                &larr; Back to Library
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-6">
                    <input 
                        type="text" 
                        value={product.name}
                        onChange={(e) => onUpdateProduct(product.id, { name: e.target.value })}
                        className="text-3xl font-bold bg-transparent border-none p-0 text-text-primary focus:ring-0 w-full"
                    />

                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setIsBrainDumpModalOpen(true)}>+ Brain Dump</Button>
                        <Button variant="ghost" onClick={() => setIsPlanModalOpen(true)}>View Product Plan</Button>
                        <Button variant="ghost" onClick={() => setIsBlueprintModalOpen(true)}>Export Blueprint</Button>
                    </div>

                    <div className="bg-surface p-4 rounded-lg">
                        <h3 className="font-bold mb-3">Features</h3>
                        <div className="flex flex-wrap gap-2">
                            {product.features.map(feature => (
                                <button key={feature.id} onClick={() => setSelectedFeatureId(feature.id)} className="px-3 py-1 rounded-full bg-background hover:bg-primary transition-colors text-sm flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${feature.status === 'shaped' ? 'bg-secondary' : 'bg-yellow-500'}`}></span>
                                    {feature.name}
                                </button>
                            ))}
                            <button onClick={handleNewFeature} className="px-3 py-1 rounded-full bg-transparent border border-dashed border-border text-text-secondary hover:border-primary hover:text-text-primary transition-colors text-sm">
                                + New Feature
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface p-4 rounded-lg">
                        <h3 className="font-bold mb-3">Latest Idea Chunks</h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {product.ideaChunks.slice().reverse().map(chunk => (
                                <div key={chunk.id} className="bg-background p-3 rounded">
                                    <p className="font-semibold">{chunk.title || new Date(chunk.createdAt).toLocaleString()}</p>
                                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{chunk.text}</p>
                                    <div className="text-xs mt-2 text-gray-400">Tags: {chunk.tags?.join(', ') || 'none'}</div>
                                </div>
                            ))}
                            {product.ideaChunks.length === 0 && <p className="text-text-secondary text-sm">No idea chunks yet. Add one with the "Brain Dump" button!</p>}
                        </div>
                    </div>
                     <div className="bg-surface p-4 rounded-lg">
                        <h3 className="font-bold mb-3">Change Log</h3>
                        <ul className="text-sm text-text-secondary space-y-1 max-h-32 overflow-y-auto">
                            {product.changeLog.slice(0, 5).map((log, i) => <li key={i}>{log}</li>)}
                        </ul>
                    </div>
                </div>
            </div>

            <BrainDumpModal 
                isOpen={isBrainDumpModalOpen}
                onClose={() => setIsBrainDumpModalOpen(false)}
                onSave={ (text, title) => onProcessBrainDump(product.id, text, title) }
                features={product.features}
                isLoading={isLoading}
            />

            <ProductPlanModal
                isOpen={isPlanModalOpen}
                onClose={() => setIsPlanModalOpen(false)}
                product={product}
                onUpdate={(updates) => onUpdateProduct(product.id, updates)}
            />

            <BlueprintExportModal
                isOpen={isBlueprintModalOpen}
                onClose={() => setIsBlueprintModalOpen(false)}
                product={product}
            />

        </div>
    );
};

export default ProductWorkspaceScreen;
