export default function Marketplace() {
  const products = [
    { id: 1, name: 'Samsung Galaxy S26 Ultra', price: 0.0029, icon: '📱' },
    { id: 2, name: 'Apple iPhone 16 Pro', price: 0.0029, icon: '📱' },
    { id: 3, name: 'Apple Watch Series 10', price: 0.0009, icon: '⌚' },
    { id: 4, name: 'Toyota Corolla 2024', price: 0.0127, icon: '🚗' },
    { id: 5, name: 'Mazda CX-9 2024', price: 0.0159, icon: '🚗' },
    { id: 6, name: 'Construction Cement Bag', price: 0.0001, icon: '🏗️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-12 text-gray-900">PHCL Marketplace</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">{product.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
              <div className="flex justify-between items-center">
                <p className="text-2xl font-bold text-purple-600">Π {product.price.toFixed(4)}</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">Buy</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
