// src/utils/streamStore.js
let previewStream = null;

export const setPreviewStream = (stream) => {
  previewStream = stream;
};

export const getPreviewStream = () => previewStream;

export const clearPreviewStream = () => {
  previewStream = null;
};
