let previewStream = null;

// Save a MediaStream globally
export const setPreviewStream = (stream) => {
  previewStream = stream;
};

// Retrieve the saved MediaStream
export const getPreviewStream = () => previewStream;

export const clearPreviewStream = () => {
  if (previewStream) {
    previewStream.getTracks().forEach((t) => t.stop());
  }
  previewStream = null;
};
