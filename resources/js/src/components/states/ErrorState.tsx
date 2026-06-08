import React from "react";

interface ErrorStateProps {
    message: string;
    onRetry?: () => void;
    onBack?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, onBack }) => {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
                <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Oops! Something went wrong</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3 justify-center">
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium"
                        >
                            Go Back
                        </button>
                    )}
                    {onRetry && (
                        <button 
                            onClick={onRetry}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};