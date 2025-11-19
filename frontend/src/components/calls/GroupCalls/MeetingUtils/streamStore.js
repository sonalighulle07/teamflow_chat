// streamStore.js
let previewStream = null;

// Save a MediaStream globally
export const setPreviewStream = (stream) => {
  previewStream = stream;
};

// Retrieve the saved MediaStream
export const getPreviewStream = () => previewStream;

// Optional: clear it when leaving the prejoin page
export const clearPreviewStream = () => {
  if (previewStream) {
    previewStream.getTracks().forEach((t) => t.stop());
  }
  previewStream = null;
};
