
import Head from 'next/head';
import Image from 'next/image';
import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type ConvertedImage = {
  id: string;
  originalName: string;
  pngUrl: string;
  status: 'pending' | 'converting' | 'done' | 'error';
};

export default function Home() {
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const id = Math.random().toString(36).substr(2, 9);
    setImages(prev => [...prev, { id, originalName: file.name, pngUrl: '', status: 'converting' }]);

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');

      ctx.drawImage(bitmap, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');

      setImages(prev => prev.map(img =>
        img.id === id ? { ...img, pngUrl, status: 'done' } : img
      ));
    } catch (error) {
      console.error(error);
      setImages(prev => prev.map(img =>
        img.id === id ? { ...img, status: 'error' } : img
      ));
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(processFile);
    }
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    images.filter(img => img.status === 'done').forEach(img => {
      const base64Data = img.pngUrl.replace(/^data:image\/png;base64,/, "");
      const fileName = img.originalName.replace(/\.[^/.]+$/, "") + ".png";
      zip.file(fileName, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "converted_images.zip");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8">
      <Head>
        <title>WebP to PNG Converter</title>
        <meta name="description" content="Convert WebP images to PNG instantly in your browser." />
      </Head>

      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-800 mb-2 text-center">WebP ➡ PNG Converter</h1>
        <p className="text-slate-500 text-center mb-8">Secure, fast, and local. No server uploads.</p>

        {/* Upload Area */}
        <div
          className={`border-4 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer mb-12
            ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 hover:border-slate-400 bg-white shadow-sm'}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept="image/webp,image/*"
          />
          <div className="text-6xl mb-4">📂</div>
          <p className="text-xl font-bold text-slate-700 mb-2">Drag & Drop WebP files here</p>
          <p className="text-slate-400">or click to browse</p>
        </div>

        {/* Actions */}
        {images.length > 0 && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-700">Converted Images ({images.length})</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setImages([])}
                className="px-4 py-2 text-slate-500 hover:text-red-500 transition font-bold"
              >
                Clear All
              </button>
              <button
                onClick={downloadAll}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition transform hover:-translate-y-1"
              >
                Download All (ZIP)
              </button>
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {images.map((img) => (
            <div key={img.id} className="bg-white p-4 rounded-xl shadow-md border border-slate-100 flex flex-col items-center group relative">
              <div className="w-full aspect-square bg-slate-100 rounded-lg overflow-hidden mb-3 relative flex items-center justify-center">
                {img.status === 'converting' ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                ) : img.pngUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.pngUrl} alt="Converted" className="object-contain w-full h-full" />
                ) : (
                  <span className="text-red-500">Error</span>
                )}
              </div>
              <div className="text-sm font-medium text-slate-600 truncate w-full text-center mb-2">
                {img.originalName.replace(/\.[^/.]+$/, "")}.png
              </div>

              {img.status === 'done' && (
                <a
                  href={img.pngUrl}
                  download={img.originalName.replace(/\.[^/.]+$/, "") + ".png"}
                  className="w-full py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm text-center hover:bg-slate-200 transition"
                >
                  Download
                </a>
              )}

              <button
                onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold leading-none opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
