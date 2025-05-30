
import bwipjs from 'bwip-js';

/**
 * Generates a PDF417 barcode as a PNG data URL using a canvas for browser compatibility.
 * @param data The string data to encode in the barcode.
 * @param errorCorrectionLevel The PDF417 error correction level (0-8).
 * @param columns The number of data columns for the PDF417 barcode (1-30).
 * @returns A promise that resolves with the PNG data URL of the barcode.
 * @throws If barcode generation fails.
 */
export const generatePdf417Barcode = async (
  data: string,
  errorCorrectionLevel: number,
  columns: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');

      const options = {
        bcid: 'pdf417',
        text: data,
        scale: 3,
        height: 25, // millimeters
        includetext: false,
        textxalign: 'center',
        // PDF417 specific options: error correction level and columns
        // Ensure these are valid numbers before constructing the options string
        options: `eclevel=${Math.max(0, Math.min(8, errorCorrectionLevel))} columns=${Math.max(1, Math.min(30, columns))}`,
      };

      bwipjs.toCanvas(canvas, options);

      const pngDataUrl = canvas.toDataURL('image/png');
      resolve(pngDataUrl);

    } catch (err) {
      console.error('Error during barcode generation:', err);
      let errorMessage = 'Failed to generate barcode.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      if (errorMessage.toLowerCase().includes("value too long") ||
          errorMessage.toLowerCase().includes("data too large") ||
          errorMessage.toLowerCase().includes("capacity exceeded")) {
        errorMessage = "The provided data is too long for the PDF417 barcode with current settings. Try reducing data, increasing columns, or adjusting error correction level.";
      } else if (errorMessage.toLowerCase().includes("unknown eci")) {
        errorMessage = "The input data may contain characters not supported by the current PDF417 encoding mode (ECI). Please verify input data, especially special characters.";
      } else if (errorMessage.toLowerCase().includes("bad ecc") || errorMessage.toLowerCase().includes("invalid ecc level")) {
        errorMessage = "Invalid error correction code level specified for PDF417.";
      } else if (errorMessage.toLowerCase().includes("invalid columns value")) {
        errorMessage = "Invalid number of columns specified for PDF417.";
      }
      
      reject(new Error(errorMessage));
    }
  });
};
