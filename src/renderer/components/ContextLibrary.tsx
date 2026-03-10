import { useState } from "react";
import type { ContextPreset } from "../lib/types";

type ContextLibraryProps = {
  presets: ContextPreset[];
  onSave: (presets: ContextPreset[]) => void;
  isOpen: boolean;
  onClose: () => void;
};

export function ContextLibrary({ presets, onSave, isOpen, onClose }: ContextLibraryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");

  // New preset mode
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newName.trim() || !newValue.trim()) return;
    const preset: ContextPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      value: newValue.trim(),
    };
    onSave([...presets, preset]);
    setNewName("");
    setNewValue("");
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    onSave(presets.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleStartEdit = (preset: ContextPreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
    setEditValue(preset.value);
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editValue.trim() || !editingId) return;
    onSave(
      presets.map((p) =>
        p.id === editingId ? { ...p, name: editName.trim(), value: editValue.trim() } : p
      )
    );
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-gray-800 rounded-2xl w-full max-w-lg p-6 border border-gray-700 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-semibold text-white">Context Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Preset list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {presets.length === 0 && !isAdding && (
            <p className="text-gray-500 text-sm text-center py-8">
              No presets yet. Click "Add" to create one.
            </p>
          )}

          {presets.map((preset) => (
            <div key={preset.id} className="bg-gray-900 rounded-lg border border-gray-700">
              {editingId === preset.id ? (
                /* Edit mode */
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Title"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                    maxLength={50}
                  />
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Context content..."
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 resize-none"
                    maxLength={500}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editName.trim() || !editValue.trim()}
                      className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-200 truncate">{preset.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{preset.value}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(preset)}
                        className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(preset.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add new preset form */}
          {isAdding && (
            <div className="bg-gray-900 rounded-lg border border-purple-700/50 p-3 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Title (e.g. Medical Conference)"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                maxLength={50}
                autoFocus
              />
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Context content (e.g. Cardiology conference discussing heart valve replacement surgery...)"
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 resize-none"
                maxLength={500}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsAdding(false); setNewName(""); setNewValue(""); }}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim() || !newValue.trim()}
                  className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 shrink-0">
          {!isAdding && (
            <button
              onClick={() => { setIsAdding(true); setEditingId(null); }}
              className="w-full py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
            >
              + Add Context Preset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
