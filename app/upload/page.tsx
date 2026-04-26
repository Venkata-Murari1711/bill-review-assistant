import UploadZone from '@/components/UploadZone';

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload a Bill</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload a PDF or image. Our AI will extract fields, check for issues, and recommend what to do.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <UploadZone />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">What happens next?</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>File is uploaded and sent to your n8n OCR workflow</li>
          <li>n8n extracts the text and calls back to this app</li>
          <li>AI extracts structured fields (vendor, amount, due date…)</li>
          <li>Decision engine assigns a recommendation</li>
          <li>You review and approve or mark as paid</li>
        </ol>
      </div>
    </div>
  );
}
