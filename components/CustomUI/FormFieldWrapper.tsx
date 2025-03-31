import { ReactNode } from "react";

interface FormFieldWrapperProps {
  form: any;
  name: string;
  label: string;
  children?: ReactNode;
  renderField?: (field: any) => ReactNode;
}

const FormFieldWrapper = ({
  form,
  name,
  label,
  children,
  renderField,
}: FormFieldWrapperProps) => {
  return (
    <div className="form-field">
      <div className="flex items-center">
        <div className="w-32 flex-shrink-0"> {/* Fixed width for label */}
          <label
            htmlFor={name}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        </div>
        <div className="flex-grow">
          {children || (renderField && renderField(form.register(name)))}
        </div>
      </div>
    </div>
  );
};

export default FormFieldWrapper;
