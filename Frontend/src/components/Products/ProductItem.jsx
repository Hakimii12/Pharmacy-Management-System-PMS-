import React, { useState } from 'react';
import { FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaTimes, FaExchangeAlt, FaBoxOpen } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
import Api from "../../data/API.json"

// ─── Batch Row ────────────────────────────────────────────────────────────────
// Renders one batch inside the expanded details panel.
const BatchRow = ({ batch, onEdit, fetchProducts, ApiLink }) => {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferType, setTransferType] = useState('issue');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const getExpiryColor = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(batch.expiryDate);
    const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'text-red-600 font-semibold';
    if (days <= 90) return 'text-yellow-600 font-semibold';
    return 'text-green-600';
  };

  const getExpiryLabel = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(batch.expiryDate);
    const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${formatDate(batch.expiryDate)} (Expired)`;
    if (days <= 30) return `${formatDate(batch.expiryDate)} (${days}d left)`;
    return formatDate(batch.expiryDate);
  };

  const availableForTransfer = transferType === 'issue'
    ? batch.inventory?.store ?? 0
    : batch.inventory?.dispensary ?? 0;

  const handleTransfer = async () => {
    setTransferError('');
    const qty = Number(transferQuantity);
    if (!qty || qty <= 0) { setTransferError('Quantity must be greater than zero'); return; }
    if (qty > availableForTransfer) { setTransferError(`Cannot transfer more than available (${availableForTransfer})`); return; }
    setIsTransferring(true);
    try {
      const endpoint = transferType === 'issue'
        ? `${ApiLink}/api/product/issueToDispensary`
        : `${ApiLink}/api/product/returnToStore`;
      await axios.post(endpoint, { productId: batch._id, quantity: qty }, { withCredentials: true });
      toast.success('Successfully transferred');
      fetchProducts();
      setIsTransferModalOpen(false);
    } catch (err) {
      setTransferError('Failed to transfer');
      toast.error('Failed to transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${ApiLink}/api/product/smartDelete/${batch._id}`, { withCredentials: true });
      toast.success('Batch removed successfully');
      fetchProducts();
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <>
      <tr className="bg-blue-50/40 hover:bg-blue-50 border-t border-blue-100 text-sm">
        {/* Indent spacer */}
        <td className="pl-10 py-3 pr-2">
          <span className="inline-flex items-center gap-1 text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
            <FaBoxOpen className="text-indigo-400" />
            {batch.batchNo}
          </span>
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
              Store: {batch.inventory?.store ?? 0}
            </span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
              Disp: {batch.inventory?.dispensary ?? 0}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Total: {batch.quantity}</div>
        </td>
        <td className={`px-3 py-3 text-xs ${getExpiryColor()}`}>
          {getExpiryLabel()}
        </td>
        <td className="px-3 py-3 text-xs text-gray-600">
          {batch.distributor?.name && batch.distributor.name !== 'Unknown'
            ? <><div>{batch.distributor.name}</div><div className="text-gray-400">{batch.distributor.contact}</div></>
            : '—'}
        </td>
        {/* Batch-level actions */}
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onEdit(batch)}
              className="text-blue-500 hover:text-blue-700 transition-colors"
              title="Edit this batch"
            >
              <FaEdit />
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-red-500 hover:text-red-700 transition-colors"
              title="Remove this batch"
            >
              <FaTrash />
            </button>
            <button
              onClick={() => { setIsTransferModalOpen(true); setTransferError(''); setTransferQuantity(1); }}
              className="text-purple-500 hover:text-purple-700 transition-colors flex items-center gap-1 text-xs font-medium"
              title="Transfer between Store & Dispensary"
            >
              <FaExchangeAlt /> Transfer
            </button>
          </div>
        </td>
      </tr>

      {/* ── Delete Confirmation Modal ── */}
      {isDeleteModalOpen && (
        <tr><td colSpan={5}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center border-b p-4">
                <h3 className="text-lg font-semibold">Confirm Removal</h3>
                <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-500 hover:text-gray-700"><FaTimes /></button>
              </div>
              <div className="p-4">
                <p className="text-gray-700 mb-2">Remove batch <strong>{batch.batchNo}</strong> of <strong>{batch.name}</strong>?</p>
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded"><strong>Warning:</strong> This will make this batch unavailable for sale!</p>
              </div>
              <div className="flex justify-end p-4 border-t gap-2">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded">Cancel</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2">
                  <FaTrash /> Confirm Removal
                </button>
              </div>
            </div>
          </div>
        </td></tr>
      )}

      {/* ── Transfer Modal ── */}
      {isTransferModalOpen && (
        <tr><td colSpan={5}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center border-b p-4">
                <h3 className="text-lg font-semibold">Inventory Transfer</h3>
                <button onClick={() => setIsTransferModalOpen(false)} className="text-gray-500 hover:text-gray-700"><FaTimes /></button>
              </div>
              <div className="p-4 space-y-4">
                {/* Product & Batch info */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="font-semibold text-gray-800">{batch.name}</div>
                  <div className="flex gap-4 text-gray-500">
                    <span>Batch: <span className="font-mono text-indigo-600">{batch.batchNo}</span></span>
                    <span className={getExpiryColor()}>Exp: {getExpiryLabel()}</span>
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">Store: {batch.inventory?.store ?? 0}</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">Dispensary: {batch.inventory?.dispensary ?? 0}</span>
                  </div>
                </div>

                {/* Transfer type */}
                <div>
                  <h4 className="font-medium mb-2 text-sm text-gray-700">Transfer Direction</h4>
                  <div className="flex space-x-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" value="issue" checked={transferType === 'issue'} onChange={() => setTransferType('issue')} />
                      Store → Dispensary
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" value="return" checked={transferType === 'return'} onChange={() => setTransferType('return')} />
                      Dispensary → Store
                    </label>
                  </div>
                </div>

                {/* Available qty */}
                <div className="text-sm text-gray-600">
                  Available in <strong>{transferType === 'issue' ? 'Store' : 'Dispensary'}</strong>:
                  <span className="ml-2 text-xl font-bold text-gray-800">{availableForTransfer}</span>
                </div>

                {/* Qty input */}
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity to Transfer</label>
                  <input
                    type="number"
                    min="1"
                    max={availableForTransfer}
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {transferError && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{transferError}</div>}
              </div>
              <div className="flex justify-end p-4 border-t gap-2">
                <button onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button
                  onClick={handleTransfer}
                  disabled={isTransferring}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                >
                  {isTransferring ? (
                    <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Processing...</>
                  ) : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
};

// ─── ProductItem (Group Row) ──────────────────────────────────────────────────
const ProductItem = ({ group, onEdit, fetchProducts }) => {
  const ApiLink = Api.link;
  const [showBatches, setShowBatches] = useState(false);

  // Derive overall status from batches
  const totalStore = group.totalStore;
  const totalDispensary = group.totalDispensary;
  const allExpired = group.batches.every(b => new Date(b.expiryDate) < new Date());
  const anyExpired = group.batches.some(b => new Date(b.expiryDate) < new Date());

  const overallStatus = () => {
    if (allExpired) return 'Expired';
    // Use the first batch's store status as a proxy, but compute from totals
    if (totalStore === 0 && totalDispensary === 0) return 'Sold Out';
    // Check any low-stock threshold — use each batch's threshold
    const anyLow = group.batches.some(b => {
      const storeThresh = b.inventory?.storeThreshold ?? 10;
      return (b.inventory?.store ?? 0) < storeThresh && (b.inventory?.store ?? 0) > 0;
    });
    if (anyLow) return 'Low Stock';
    return 'In Stock';
  };

  const statusLabel = overallStatus();

  const getStatusColor = (s) => {
    switch (s) {
      case 'Expired': return 'bg-gray-200 text-red-900';
      case 'Sold Out': return 'bg-red-100 text-red-800';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const sellingPrice = group.sellingPrice ?? (group.unitPrice * (1 + group.markup / 100));

  return (
    <>
      {/* ── Parent / Summary Row ── */}
      <tr
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${showBatches ? 'bg-indigo-50' : ''}`}
        onClick={() => setShowBatches(prev => !prev)}
      >
        {/* Name */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">{group.name.charAt(0)}</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{group.name}</div>
              <div className="text-xs text-gray-500">{group.brand !== 'no_brand' ? group.brand : ''}</div>
              {group.type && <div className="text-xs text-blue-500 mt-0.5">{group.type}</div>}
              {group.batches.length > 1 && (
                <span className="inline-block mt-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                  {group.batches.length} batches
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Category */}
        <td className="px-4 py-4 text-sm font-medium text-gray-900">
          {group.category}
          {group.DosageForms && <div className="text-xs text-gray-400 font-normal">{group.DosageForms}</div>}
        </td>

        {/* Total Quantity */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className={`text-lg font-bold ${group.totalQuantity <= 5 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {group.totalQuantity}
          </div>
          <div className="flex gap-2 mt-1">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
              Store: {group.totalStore}
            </span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
              Disp: {group.totalDispensary}
            </span>
          </div>
        </td>

        {/* Price */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">{group.unitPrice?.toFixed(2)} <span className="text-xs text-green-600">ETB</span></div>
          <div className="text-xs text-green-600">{sellingPrice?.toFixed(2)} ETB sale</div>
        </td>

        {/* Status */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(statusLabel)}`}>
            {statusLabel}
          </span>
          {anyExpired && !allExpired && (
            <div className="text-xs text-red-500 mt-0.5">some batches expired</div>
          )}
        </td>

        {/* Expand toggle */}
        <td className="px-6 py-4 whitespace-nowrap text-sm" colSpan={2}>
          <div className="flex items-center gap-2 text-gray-500 hover:text-gray-800">
            {showBatches ? <FaChevronUp /> : <FaChevronDown />}
            <span className="text-xs">{showBatches ? 'Hide batches' : 'Show batches'}</span>
          </div>
        </td>
      </tr>

      {/* ── Batch Details Panel ── */}
      {showBatches && (
        <>
          {/* Sub-header */}
          <tr className="bg-indigo-50 border-t border-indigo-100">
            <th className="pl-10 py-2 text-left text-xs font-semibold text-indigo-500 uppercase">Batch #</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-indigo-500 uppercase">Stock</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-indigo-500 uppercase">Expiry Date</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-indigo-500 uppercase">Distributor</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-indigo-500 uppercase" colSpan={2}>Actions</th>
          </tr>
          {group.batches.map(batch => (
            <BatchRow
              key={batch._id}
              batch={batch}
              onEdit={onEdit}
              fetchProducts={fetchProducts}
              ApiLink={ApiLink}
            />
          ))}
          {/* Totals footer */}
          <tr className="bg-indigo-100/60 border-t border-indigo-200">
            <td className="pl-10 py-2 text-xs font-bold text-indigo-700">Totals</td>
            <td className="px-3 py-2">
              <div className="flex gap-1">
                <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">Store: {group.totalStore}</span>
                <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold">Disp: {group.totalDispensary}</span>
              </div>
            </td>
            <td colSpan={4} className="px-3 py-2 text-xs text-indigo-600 font-semibold">
              Combined Total: {group.totalQuantity} units
            </td>
          </tr>
        </>
      )}
    </>
  );
};

export default ProductItem;