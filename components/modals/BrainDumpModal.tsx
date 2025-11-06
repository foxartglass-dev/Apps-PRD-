
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Feature } from '../../types';
import { Spinner } from '../common/Spinner';

interface BrainDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string, title?: string, featureId?: string) => void;
  features: Feature[];
  isLoading: boolean;
}

const BrainDumpModal: React.FC<BrainDumpModalProps> = ({ isOpen, onClose, onSave, features, isLoading }) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), title.trim() || undefined);
      // Resetting state can be done here if the modal should clear after saving
      // setTitle('');
      // setText('');
      onClose(); // Or close it from the parent component after promise resolves
    }
  };
  
  // Do not close modal when loading
  const handleClose = () => {
      if(!isLoading) onClose();
  }
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Brain Dump"
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || !text.trim()}>
            {isLoading ? <><Spinner size="sm"/> Saving & Classifying...</> : 'Save & Classify'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="dump-title" className="block text-sm font-medium text-text-secondary mb-1">Title (optional)</label>
          <input
            id="dump-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:ring-primary focus:border-primary"
            placeholder="A brief summary"
          />
        </div>
        <div>
          <label htmlFor="dump-text" className="block text-sm font-medium text-text-secondary mb-1">Your ideas, thoughts, notes...</label>
          <textarea
            id="dump-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={15}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:ring-primary focus:border-primary"
            placeholder="Dump all your thoughts about the product or a specific feature here."
          />
        </div>
      </div>
    </Modal>
  );
};

export default BrainDumpModal;
