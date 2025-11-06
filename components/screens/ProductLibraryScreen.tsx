
import React, { useState } from 'react';
import { Product } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { PlusIcon } from '../icons/PlusIcon';
import { CogIcon } from '../icons/CogIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface ProductLibraryScreenProps {
  products: Product[];
  onCreateProduct: (name: string) => void;
  onSelectProduct: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGoToSettings: () => void;
}

const ProductLibraryScreen: React.FC<ProductLibraryScreenProps> = ({
  products,
  onCreateProduct,
  onSelectProduct,
  onDeleteProduct,
  onExport,
  onImport,
  onGoToSettings,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');

  const handleCreate = () => {
    if (newProductName.trim()) {
      onCreateProduct(newProductName.trim());
      setNewProductName('');
      setIsCreateModalOpen(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-text-primary">Idea Spec Studio</h1>
        <div className="flex items-center gap-2">
            <input type="file" id="import-json" className="hidden" accept=".json" onChange={onImport} />
            <Button variant="ghost" onClick={() => document.getElementById('import-json')?.click()}>Import JSON</Button>
            <Button variant="ghost" onClick={onExport}>Export JSON</Button>
            <Button variant="ghost" onClick={onGoToSettings}><CogIcon className="w-5 h-5"/></Button>
        </div>
      </header>

      <main>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-surface p-6 rounded-lg shadow-lg flex flex-col justify-between hover:ring-2 ring-primary transition-all">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{product.name}</h2>
                <p className="text-text-secondary mt-2 text-sm h-10 overflow-hidden">{product.summary || 'No summary yet.'}</p>
                <div className="flex text-xs text-text-secondary mt-4 gap-4">
                  <span>{product.features.length} Features</span>
                  <span>{product.ideaChunks.length} Chunks</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-6">
                 <span className="text-xs text-gray-400">Updated: {new Date(product.lastUpdated).toLocaleDateString()}</span>
                <div className="flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id)}} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                   <Button onClick={() => onSelectProduct(product.id)}>Open</Button>
                </div>
              </div>
            </div>
          ))}
            <button onClick={() => setIsCreateModalOpen(true)} className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-text-secondary hover:bg-surface hover:border-primary transition-colors p-6 min-h-[200px]">
                <PlusIcon className="w-12 h-12 mb-2"/>
                <span className="font-semibold">New Product</span>
            </button>
        </div>
      </main>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Product"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </>
        }
      >
        <div className="space-y-2">
          <label htmlFor="product-name" className="block text-sm font-medium text-text-secondary">Product Name</label>
          <input
            id="product-name"
            type="text"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:ring-primary focus:border-primary"
            placeholder="e.g., Social media for pets"
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default ProductLibraryScreen;
