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
        <FormItem className="flex items-start">
          <FormLabel className="mt-3 mr-4 flex-shrink-0 min-w-[140px]">
            <span className="font-bold text-xs text-gray-700">{label}</span>
          </FormLabel>
          <FormControl className={`${className} flex-1`}>
            {renderField ? renderField(field) : children}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default FormFieldWrapper;
