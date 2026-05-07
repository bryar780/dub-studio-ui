import React from 'react';

const Spinner = ({ text = "Processing..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-purple-300 font-medium animate-pulse">{text}</p>
    </div>
  );
};

export default Spinner;
