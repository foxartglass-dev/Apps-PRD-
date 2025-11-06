
import React from 'react';

export const CogIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-.95l2.176.346a1.125 1.125 0 0 1 .95 1.11l-.346 2.176a1.125 1.125 0 0 1-1.11.95l-2.176-.346a1.125 1.125 0 0 1-.95-1.11l.346-2.176Zm4.468 9.068c.09-.542.56-1.007 1.11-.95l2.176.346a1.125 1.125 0 0 1 .95 1.11l-.346 2.176a1.125 1.125 0 0 1-1.11.95l-2.176-.346a1.125 1.125 0 0 1-.95-1.11l.346-2.176Zm-8.94.492c.09-.542.56-1.007 1.11-.95l2.176.346a1.125 1.125 0 0 1 .95 1.11l-.346 2.176a1.125 1.125 0 0 1-1.11.95l-2.176-.346a1.125 1.125 0 0 1-.95-1.11l.346-2.176Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.375a5.625 5.625 0 1 0 0 11.25 5.625 5.625 0 0 0 0-11.25Z" />
    </svg>
);
