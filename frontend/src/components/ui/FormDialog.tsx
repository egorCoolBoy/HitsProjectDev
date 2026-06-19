import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';

export type FormField = {
  name: string;
  label: string;
  type?: 'text' | 'number';
  placeholder?: string;
  required?: boolean;
  min?: number;
  step?: string;
  defaultValue?: string;
};

type FormDialogProps = {
  open: boolean;
  title: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
  error?: string | null;
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
};

export function FormDialog({
  open,
  title,
  fields,
  submitLabel = 'Сохранить',
  cancelLabel = 'Отмена',
  error,
  onSubmit,
  onClose,
}: FormDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const initial = Object.fromEntries(
      fields.map((field) => [field.name, field.defaultValue ?? '']),
    );
    setValues(initial);
  }, [open, fields]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1.5">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type ?? 'text'}
              placeholder={field.placeholder}
              required={field.required}
              min={field.min}
              step={field.step}
              value={values[field.name] ?? ''}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.name]: event.target.value }))
              }
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent"
              autoFocus={field === fields[0]}
            />
          </div>
        ))}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0088cc] hover:bg-[#0077bb] text-white font-medium transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
