import React, { useState } from 'react';
import API from '../../services/api';
import { ExpenseItem } from '../../types/api';
import { Search, X } from 'lucide-react';
// import { toast } from 'sonner'; // ✅ import toast

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  classificationId: number;
  classificationName: string;
  planId: number;
  expenseItems: ExpenseItem[];
  existingItemIds: number[];
  onItemAdded: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  classificationId,
  classificationName,
  planId,
  expenseItems,
  existingItemIds,
  onItemAdded,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<ExpenseItem | null>(null);
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

  // Filter items by classification and not already in plan
  const availableItems = expenseItems.filter(
    item =>
      item.expense_class_id === classificationId &&
      !existingItemIds.includes(item.expense_class_item_id)
  );

  const filteredItems = availableItems.filter(item =>
    item.expense_class_item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.expense_class_item_acc_code && item.expense_class_item_acc_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = async () => {
    if (!selectedItem || adding) return;
    setAdding(true);
    try { 
      await API.post(`/department-budget-plans/${planId}/items`, {
        expense_item_id: selectedItem.expense_class_item_id,
        sem1_amount: 0,
        sem2_amount: 0,
      });
      // toast.success('Item added successfully'); // ✅ success toast
      onItemAdded();
      onClose();
    } catch (error) {
      console.error('Failed to add item', error);
      // toast.error('Failed to add item.'); // ✅ error toast instead of alert
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto shadow-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Expense Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Adding to: <span className="font-medium text-gray-700">{classificationName}</span>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Search Expense Item
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type to search..."
              className="w-full border border-gray-200 rounded-md p-2 pl-9 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              autoFocus
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Available Items ({filteredItems.length})
          </p>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <div
                  key={item.expense_class_item_id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedItem?.expense_class_item_id === item.expense_class_item_id
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="text-sm font-medium text-gray-900">{item.expense_class_item_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Code: {item.expense_class_item_acc_code || 'N/A'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No items found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedItem || adding}
            className={`px-4 py-2 rounded-md flex items-center justify-center min-w-[100px] text-sm font-medium transition ${
              selectedItem && !adding
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {adding ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;