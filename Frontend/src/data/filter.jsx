// Example: c:\Users\hp\Desktop\HamzaPharamacy\Frontend\src\pages\Products.jsx
import React, { useState } from 'react';
import ProductItem from '../components/Products/ProductItem';

const Products = ({ products }) => {
  const [distributorFilter, setDistributorFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dosageFormFilter, setDosageFormFilter] = useState('');

  const filteredProducts = products.filter(product => {
    // Distributor name filter
    const distributorMatch = distributorFilter === '' ||
      (product.distributor?.name || '').toLowerCase().includes(distributorFilter.toLowerCase());

    // Store/Dispensary filter
    let locationMatch = true;
    if (locationFilter === 'store') {
      locationMatch = (product.inventory?.store ?? 0) > 0;
    } else if (locationFilter === 'dispensary') {
      locationMatch = (product.inventory?.dispensary ?? 0) > 0;
    }

    // Dosage form filter
    const dosageMatch = dosageFormFilter === '' ||
      (product.DosageForms || '').toLowerCase() === dosageFormFilter.toLowerCase();

    return distributorMatch && locationMatch && dosageMatch;
  });

  return (
    <div>
      {/* Filter UI */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Distributor Name"
          value={distributorFilter}
          onChange={e => setDistributorFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        />
        <select
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="all">All Locations</option>
          <option value="store">Store</option>
          <option value="dispensary">Dispensary</option>
        </select>
        <select
          value={dosageFormFilter}
          onChange={e => setDosageFormFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">All Dosage Forms</option>
          <option value="tablet">Tablet</option>
          <option value="syrup">Syrup</option>
          <option value="injection">Injection</option>
          <option value="ointment">Ointment</option>
        </select>
      </div>

      {/* Products Table */}
      <table className="min-w-full divide-y divide-gray-200">
        <tbody>
          {filteredProducts.map(product => (
            <ProductItem key={product._id} product={product} onEdit={() => {}} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Products;