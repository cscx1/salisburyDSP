import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TimeInput from './TimeInput';

const SortableEffectRow = ({
  effect,
  index,
  updateEffect,
  toggleSettings,
  removeEffectRow,
  expandedId,
  EFFECT_SETTINGS,
  LABELS,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: effect.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="mb-4 p-3 border border-neutral-700 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
    >
      <div className="flex items-center space-x-2">
        <div
          {...listeners}
          className="cursor-grab px-2 text-neutral-400 text-xl"
          title="Drag to reorder"
        >
          ⋮⋮
        </div>

        <select
          value={effect.effectType}
          onChange={(e) => updateEffect(index, 'effectType', +e.target.value)}
          className="border p-2 flex-1"
        >
          <option value={1}>Bass Boost</option>
          <option value={2}>Mids Boost</option>
          <option value={3}>High Boost</option>
          <option value={4}>Compressor</option>
          <option value={5}>Reverb</option>
          <option value={6}>Chorus</option>
        </select>

        <TimeInput
          value={effect.start}
          placeholder="Start (m:s) or (s)"
          onValidInput={(parsed) => updateEffect(index, 'start', parsed)}
          className="border p-2 w-24"
        />

        <TimeInput
          value={effect.end}
          placeholder="End (m:s) or (s)"
          onValidInput={(parsed) => updateEffect(index, 'end', parsed)}
          className="border p-2 w-24"
        />

        <button
          onClick={() => toggleSettings(effect.id)}
          className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700"
        >
          {expandedId === effect.id ? 'Hide' : 'Settings'}
        </button>

        <button
          onClick={() => removeEffectRow(effect.id)}
          className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600"
        >
          Remove
        </button>
      </div>

      {expandedId === effect.id && (
        <div className="mt-2 p-2 border rounded bg-neutral-900 text-white grid grid-cols-2 md:grid-cols-4 gap-4">
          {(EFFECT_SETTINGS[effect.effectType] || []).map((field) => (
            <div key={field}>
              <label className="block text-sm mb-1">{LABELS[field]}</label>
              <input
                type="number"
                value={effect.settings[field] ?? ''}
                onChange={(e) =>
                  updateEffect(index, field, e.target.value, true)
                }
                className="border p-1 rounded w-full text-white"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SortableEffectRow;
