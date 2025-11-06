
import React, { useState, useEffect } from 'react';
import { AppState, Product, Feature, IdeaChunk, PromptTemplates } from './types';
import { INITIAL_APP_STATE } from './constants';
import ProductLibraryScreen from './components/screens/ProductLibraryScreen';
import ProductWorkspaceScreen from './components/screens/ProductWorkspaceScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import { classifyBrainDump, shapeFeatureSpec } from './services/geminiService';
import { downloadJson, uploadJson } from './utils/fileUtils';

type View = 'library' | 'product' | 'settings';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(() => {
        const savedState = localStorage.getItem('ideaSpecStudioState');
        return savedState ? JSON.parse(savedState) : INITIAL_APP_STATE;
    });
    const [currentView, setCurrentView] = useState<View>('library');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem('ideaSpecStudioState', JSON.stringify(appState));
    }, [appState]);

    const logChange = (productId: string, message: string) => {
        setAppState(prev => ({
            ...prev,
            products: prev.products.map(p => 
                p.id === productId 
                    ? { ...p, changeLog: [`[${new Date().toISOString().split('T')[0]}] ${message}`, ...p.changeLog] } 
                    : p
            )
        }));
    };

    const handleCreateProduct = (name: string) => {
        const newProduct: Product = {
            id: `prod_${Date.now()}`,
            name,
            features: [],
            ideaChunks: [],
            changeLog: [`[${new Date().toISOString().split('T')[0]}] Product created.`],
            lastUpdated: new Date().toISOString(),
        };
        setAppState(prev => ({ ...prev, products: [...prev.products, newProduct] }));
    };
    
    const handleSelectProduct = (productId: string) => {
        setSelectedProductId(productId);
        setCurrentView('product');
    };

    const handleDeleteProduct = (productId: string) => {
        if (window.confirm("Are you sure you want to delete this product and all its data?")) {
            setAppState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== productId) }));
        }
    };
    
    const handleProcessBrainDump = async (productId: string, text: string, title?: string, featureId?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const product = appState.products.find(p => p.id === productId);
            if (!product) throw new Error("Product not found");

            const newChunk: IdeaChunk = {
                id: `chunk_${Date.now()}`,
                productId,
                text,
                title,
                createdAt: new Date().toISOString(),
            };

            const result = await classifyBrainDump(product, text, appState.prompts);

            setAppState(prev => {
                const updatedProducts = prev.products.map(p => {
                    if (p.id !== productId) return p;

                    let updatedProduct = { ...p, ideaChunks: [...p.ideaChunks, { ...newChunk, tags: result.chunk_tags }] };
                    
                    if (result.product_updates) {
                        updatedProduct.mission = `${updatedProduct.mission || ''}\n${result.product_updates.mission_additions || ''}`.trim();
                        updatedProduct.roadmap = {
                            mvp: `${updatedProduct.roadmap?.mvp || ''}\n${result.product_updates.roadmap_mvp_additions || ''}`.trim(),
                            next: `${updatedProduct.roadmap?.next || ''}\n${result.product_updates.roadmap_next_additions || ''}`.trim(),
                            later: `${updatedProduct.roadmap?.later || ''}\n${result.product_updates.roadmap_later_additions || ''}`.trim(),
                        };
                        updatedProduct.techPreferences = `${updatedProduct.techPreferences || ''}\n${result.product_updates.tech_preferences_additions || ''}`.trim();
                    }

                    if(result.new_features) {
                        result.new_features.forEach((nf: any) => {
                            const newFeature: Feature = {
                                id: `feat_${Date.now()}_${Math.random()}`,
                                productId: p.id,
                                name: nf.proposed_name,
                                summary: nf.one_line_summary,
                                status: 'draft',
                                ideaChunkIds: [newChunk.id],
                            };
                            updatedProduct.features.push(newFeature);
                            updatedProduct.changeLog.unshift(`[${new Date().toISOString().split('T')[0]}] New feature created from brain dump: ${nf.proposed_name}`);
                        });
                    }
                    
                    if(result.feature_notes) {
                        result.feature_notes.forEach((fn: any) => {
                            const feature = updatedProduct.features.find(f => f.id === fn.feature_id_or_name || f.name === fn.feature_id_or_name);
                            if (feature) {
                                feature.shapeSpec = `${feature.shapeSpec || ''}\n\n---\n*Notes from brain dump:*\n${fn.notes}`.trim();
                                if(!feature.ideaChunkIds.includes(newChunk.id)) {
                                    feature.ideaChunkIds.push(newChunk.id);
                                }
                            }
                        });
                    }

                    updatedProduct.lastUpdated = new Date().toISOString();
                    updatedProduct.changeLog.unshift(`[${new Date().toISOString().split('T')[0]}] Brain dump added: "${title || text.substring(0, 30)}..."`);

                    return updatedProduct;
                });
                return { ...prev, products: updatedProducts };
            });

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleShapeFeature = async (productId: string, featureId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const product = appState.products.find(p => p.id === productId);
            const feature = product?.features.find(f => f.id === featureId);
            if(!product || !feature) throw new Error("Feature or product not found");

            const relatedChunks = product.ideaChunks.filter(c => feature.ideaChunkIds.includes(c.id));
            const result = await shapeFeatureSpec(product, feature, relatedChunks, appState.prompts);

            setAppState(prev => ({
                ...prev,
                products: prev.products.map(p => p.id === productId ? {
                    ...p,
                    features: p.features.map(f => f.id === featureId ? {
                        ...f,
                        name: result.feature_name,
                        summary: result.summary_one_liner,
                        shapeSpec: result.shape_spec_markdown,
                        completeness: result.completeness_score,
                        status: 'shaped',
                    } : f),
                    lastUpdated: new Date().toISOString(),
                    changeLog: [`[${new Date().toISOString().split('T')[0]}] Feature shaped: ${result.feature_name}`, ...p.changeLog]
                } : p)
            }));

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUpdateProduct = (productId: string, updates: Partial<Product>) => {
        setAppState(prev => ({
            ...prev,
            products: prev.products.map(p => p.id === productId ? { ...p, ...updates, lastUpdated: new Date().toISOString() } : p)
        }));
    }

    const handleUpdateFeature = (productId: string, featureId: string, updates: Partial<Feature>) => {
         setAppState(prev => ({
            ...prev,
            products: prev.products.map(p => p.id === productId ? {
                ...p,
                features: p.features.map(f => f.id === featureId ? { ...f, ...updates } : f),
                lastUpdated: new Date().toISOString()
            } : p)
        }));
    }
    
    const handleUpdatePrompts = (newPrompts: PromptTemplates) => {
        setAppState(prev => ({...prev, prompts: newPrompts}));
    };

    const handleExport = () => {
        downloadJson(appState, 'ideaspec-appstate.json');
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (window.confirm("This will replace all current data. Are you sure?")) {
                try {
                    const importedState = await uploadJson<AppState>(file);
                    // Basic validation
                    if (importedState.products && importedState.prompts) {
                        setAppState(importedState);
                    } else {
                        throw new Error("Invalid file format.");
                    }
                } catch (e: any) {
                    setError(e.message);
                }
            }
        }
    };
    
    const selectedProduct = appState.products.find(p => p.id === selectedProductId);

    const renderView = () => {
        switch (currentView) {
            case 'product':
                return selectedProduct ? (
                    <ProductWorkspaceScreen
                        product={selectedProduct}
                        onBack={() => { setSelectedProductId(null); setCurrentView('library'); }}
                        onProcessBrainDump={handleProcessBrainDump}
                        onShapeFeature={handleShapeFeature}
                        onUpdateProduct={handleUpdateProduct}
                        onUpdateFeature={handleUpdateFeature}
                        isLoading={isLoading}
                    />
                ) : null;
            case 'settings':
                return <SettingsScreen 
                            prompts={appState.prompts} 
                            onUpdatePrompts={handleUpdatePrompts} 
                            onBack={() => setCurrentView('library')} 
                        />;
            case 'library':
            default:
                return (
                    <ProductLibraryScreen
                        products={appState.products}
                        onCreateProduct={handleCreateProduct}
                        onSelectProduct={handleSelectProduct}
                        onDeleteProduct={handleDeleteProduct}
                        onExport={handleExport}
                        onImport={handleImport}
                        onGoToSettings={() => setCurrentView('settings')}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-background text-text-primary">
            {error && (
                <div className="bg-red-500 text-white p-4 fixed top-0 left-0 right-0 z-50 flex justify-between items-center">
                    <span>Error: {error}</span>
                    <button onClick={() => setError(null)} className="font-bold">X</button>
                </div>
            )}
            {isLoading && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-surface p-6 rounded-lg flex items-center gap-4">
                        <div className="w-8 h-8 border-4 border-t-primary border-transparent rounded-full animate-spin"></div>
                        <span className="text-lg">Processing...</span>
                    </div>
                </div>
            )}
            {renderView()}
        </div>
    );
};

export default App;
