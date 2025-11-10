import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn, ControllerRenderProps } from "react-hook-form";

interface FormFieldWrapperProps {
  form: UseFormReturn<any>;
  name: string;
  label: React.ReactNode;
  children?: React.ReactNode;
  renderField?: (field: ControllerRenderProps<any, any>) => React.ReactNode;
  className?: string;
}

const FormFieldWrapper = ({
  form,
  name,
  label,
  children,
  renderField,
  className = "mt-3 flex-col flex-2",
}: FormFieldWrapperProps) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <FormLabel className="flex-shrink-0 sm:w-32 pt-2 sm:pt-0">
            <span className="font-bold text-xs text-gray-700 whitespace-nowrap">{label}</span>
          </FormLabel>
          <div className="flex-1 min-w-0">
            <FormControl>
              {renderField ? renderField(field) : children}
            </FormControl>
            <FormMessage className="mt-1" />
          </div>
        </FormItem>
      )}
    />
  );
};

export default FormFieldWrapper;
