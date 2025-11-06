
import React from 'react';
import { Feature, Product } from '../../types';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';

interface FeatureDetailScreenProps {
  feature: Feature;
  product: Product;
  onBack: () => void;
  onShapeFeature: (productId: string, featureId: string) => Promise<void>;
  onUpdateFeature: (productId: string, featureId: string, updates: Partial<Feature>) => void;
  isLoading: boolean;
}

const FeatureDetailScreen: React.FC<FeatureDetailScreenProps> = ({
  feature,
  product,
  onBack,
  onShapeFeature,
  onUpdateFeature,
  isLoading,
}) => {
    const relatedChunks = product.ideaChunks.filter(c => feature.ideaChunkIds.includes(c.id));
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Button variant="ghost" onClick={onBack} className="mb-4">
                &larr; Back to Product
            </Button>
            
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <span className={`w-3 h-3 rounded-full ${feature.status === 'shaped' ? 'bg-secondary' : 'bg-yellow-500'}`}></span>
                    <input 
                        type="text" 
                        value={feature.name}
                        onChange={(e) => onUpdateFeature(product.id, feature.id, { name: e.target.value })}
                        className="text-2xl font-bold bg-transparent border-none p-0 text-text-primary focus:ring-0 w-full"
                    />
                    <span className="text-sm bg-surface px-2 py-1 rounded">{feature.status}</span>
                </div>
                <Button onClick={() => onShapeFeature(product.id, feature.id)} disabled={isLoading}>
                    {isLoading ? <><Spinner size="sm" /> Shaping...</> : 'Shape / Update Spec'}
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-surface p-6 rounded-lg">
                    <h3 className="text-lg font-bold mb-4">Shape Spec</h3>
                    <textarea 
                        value={feature.shapeSpec || ''}
                        onChange={(e) => onUpdateFeature(product.id, feature.id, { shapeSpec: e.target.value })}
                        placeholder="Click 'Shape / Update Spec' to generate, or write your own..."
                        className="w-full h-[60vh] bg-background border border-border rounded-md p-4 text-text-secondary whitespace-pre-wrap font-mono text-sm"
                    />
                    <div className="mt-2 text-right text-sm text-gray-400">Completeness: {feature.completeness || 0}%</div>
                </div>

                <div className="md:col-span-1 bg-surface p-6 rounded-lg">
                    <h3 className="text-lg font-bold mb-4">Related Idea Chunks</h3>
                    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                        {relatedChunks.map(chunk => (
                            <div key={chunk.id} className="bg-background p-3 rounded">
                                <p className="font-semibold">{chunk.title || new Date(chunk.createdAt).toLocaleString()}</p>
                                <p className="text-sm text-text-secondary whitespace-pre-wrap">{chunk.text}</p>
                            </div>
                        ))}
                        {relatedChunks.length === 0 && <p className="text-text-secondary text-sm">No chunks are related to this feature yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeatureDetailScreen;
