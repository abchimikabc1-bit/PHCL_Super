export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse">
          <span className="text-2xl font-bold text-white">Ⓟ</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Phcl Super</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
