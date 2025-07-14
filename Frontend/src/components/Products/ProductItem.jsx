import React, { useState } from 'react';
import { FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
const ProductItem = ({ product, onEdit, onTransferSuccess }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferType, setTransferType] = useState('issue');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState('');
  const [addedBy , setAddedBy] = useState([]);

  const getStatusColor = () => {
    switch (product.status) {
      case 'In Stock':
        return 'bg-green-100 text-green-800';
      case 'Low Stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'Sold Out':
        return 'bg-red-100 text-red-800';
      case 'Expired':
        return 'bg-gray-200 text-red-900';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };
  //  if(product.inventory.store > product.inventory.storeThreshold && product.inventory.dispensary > product.inventory.dispensaryThreshold && !product.isExpired){
  //        return 'bg-green-100 text-green-800'
  //  }
  //  else if(product.inventory.store <= product.inventory.storeThreshold && product.inventory.dispensary <= product.inventory.dispensaryThreshold && !product.isExpired && product.quantity > 0){
  //        return 'bg-yellow-100 text-yellow-800'
  //  }
  //  else if(product.isExpired){
  //       return 'bg-gray-200 text-red-900'
  //  }
  //  else if(product.quantity == 0 ){
  //       return 'bg-red-100 text-red-800'
  //  }
  const getExpiryStatus = () => {
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: 'Expired', color: 'text-red-500' };
    } else if (diffDays < 30) {
      return { text: `Expires in ${diffDays} days`, color: 'text-yellow-500' };
    } else {
      return {
        text: expiryDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        color: 'text-gray-500'
      };
    }
  };
async function AddedByUser(){
      try {
      let id =product?.addedBy
      const endpoint = `http://localhost:5000/api/user/user/${id}`
      await axios.get(endpoint,{
        headers: {
          'Content-Type': 'application/json',   
        },
        withCredentials: true
      }).then((response)=>{
        setAddedBy(response.data);
      })
    } catch (error) {
      console.log(err)
    }
}
useEffect(() => {
  AddedByUser();
}, [product?.addedBy]);
  const handleTransfer = async (productId,transferQuantity) => {
    setError('');
    if (!transferQuantity || transferQuantity <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    const availableQuantity = transferType === 'issue' 
      ? product.inventory?.store 
      : product.inventory?.dispensary;
    
    if (transferQuantity > availableQuantity) {
      setError(`Cannot transfer more than available (${availableQuantity})`);
      return;
    }

    setIsTransferring(true);
    const quantity = Number(transferQuantity)
    try {
      const endpoint = transferType === 'issue' 
        ? 'http://localhost:5000/api/product/issueToDispensary'
        : 'http://localhost:5000/api/product/returnToStore';

      await axios.post(endpoint,{ productId, quantity }, {
        headers: {
          'Content-Type': 'application/json',
          
        },
        withCredentials: true
      });
       toast.success("successfully transferred")
      setIsTransferModalOpen(false);
      
      if (onTransferSuccess) onTransferSuccess();
    } catch (err) {
      setError('failed to transfer');
      toast.error("failed to transfer")
      console.log(err)
    } finally {
      setIsTransferring(false);
    }
  };

  const expiryStatus = getExpiryStatus();
  const sellingPrice = product.unitPrice * (1 + product.markup / 100);

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold">{product.name.charAt(0)}</span>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">{product.name}</div>
              <div className="text-sm text-gray-500">{product.brand}</div>
            </div>
          </div>
        </td>
        <td className="text-sm font-medium text-gray-900">
          {product.category}
          <div className="text-sm font-extralight text-gray-500">{product.batchNo}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className={`text-lg font-bold ${product.quantity <= 5 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {product.quantity} 
          </div>
          <div className="flex gap-2 mt-1">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
              Store: {product.inventory?.store ?? 0}
            </span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
              Dispensary: {product.inventory?.dispensary ?? 0}
            </span>
          </div>
          <div className={`text-xs mt-1 ${expiryStatus.color}`}>
            {expiryStatus.text}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">{product.unitPrice.toFixed(2)} <span className='text-xs text-green-600'>ETB</span></div>
          <div className="text-xs text-green-600">{sellingPrice.toFixed(2)} <span>ETB</span> sale</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor()}`}>
            {product.status}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-2">
          <button
            onClick={() => onEdit(product)}
            className="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
            title="Edit product"
          >
            <FaEdit className="text-lg" />
          </button>
          <button
            className="text-red-600 hover:text-red-900 transition-colors"
            title="Delete product"
          >
            <FaTrash className="text-lg" />
          </button>
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="ml-2 text-gray-500 hover:text-gray-900"
            title={showDetails ? "Hide details" : "Show more"}
          >
            {showDetails ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </td>
        <td className="px-4 py-1 whitespace-nowrap text-sm font-medium flex items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="relative group"
          >
            <p className="
              inline-block 
              text-xs
              font-medium 
              bg-gradient-to-r from-blue-500 to-purple-500 
              bg-clip-text text-transparent 
              animate-gradient-x
              group-hover:from-pink-500 group-hover:to-yellow-500
              transition-colors duration-500
            ">
              Inventory Transfer
            </p>
            <span className="
              absolute bottom-0 left-0 
              w-0 h-0.5 
              bg-gradient-to-r from-pink-500 to-yellow-500 
              transition-all duration-300 
              group-hover:w-full
            "></span>
          </button>
        </td>
      </tr>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold">Inventory Transfer</h3>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <h4 className="font-medium mb-1">Product</h4>
                <p className="bg-gray-50 p-2 rounded">{product.name} - {product.brand}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium mb-1">Transfer Type</h4>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="issue"
                      checked={transferType === 'issue'}
                      onChange={() => setTransferType('issue')}
                      className="mr-2"
                    />
                    <span>Issue to Dispensary</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="return"
                      checked={transferType === 'return'}
                      onChange={() => setTransferType('return')}
                      className="mr-2"
                    />
                    <span>Return to Store</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium mb-1">
                  Available in {transferType === 'issue' ? 'Store' : 'Dispensary'}
                </h4>
                <p className="text-xl font-bold">
                  {transferType === 'issue' 
                    ? product.inventory?.store || 0 
                    : product.inventory?.dispensary || 0}
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="quantity" className="block font-medium mb-1">
                  Quantity to Transfer
                </label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max={transferType === 'issue' ? product.inventory?.store : product.inventory?.dispensary}
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="mr-3 px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={()=>handleTransfer(product._id,transferQuantity)}
                disabled={isTransferring}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
              >
                {isTransferring ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Row */}
      {showDetails && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-6 py-4 transition-all duration-300 animate-fade-in-down">
            <div className="text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-8">
              <div><strong>Distributor:</strong> {product.distributor?.name}</div>
              <div><strong>Contact:</strong> {product.distributor?.contact}</div>
              <div><strong>Dosage Form:</strong> {product.DosageForms}</div>
              <div><strong>Category:</strong> {product.category}</div>
              <div><strong>Store:</strong> {product.inventory?.store}</div>
              <div><strong>Dispensary:</strong> {product.inventory?.dispensary}</div>
              <div><strong>Store Threshold:</strong> {product.inventory?.storeThreshold}</div>
              <div><strong>Dispensary Threshold:</strong> {product.inventory?.dispensaryThreshold}</div>
              <div><strong>Launched At:</strong> {new Date(product.createdAt).toLocaleString()}</div>
              <div><strong>Launched By:</strong> {addedBy?.name} <span className='text-sm text-blue-500'>({addedBy?.role})</span></div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default ProductItem;