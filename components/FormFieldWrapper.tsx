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
        <FormItem className="flex flex-col sm:flex-row sm:items-start gap-2">
          <FormLabel className="sm:mt-3 sm:mr-4 flex-shrink-0 sm:min-w-[140px] pt-2 sm:pt-3">
            <span className="font-bold text-xs text-gray-700 whitespace-nowrap">{label}</span>
          </FormLabel>
          <FormControl className={`${className} flex-1 w-full`}>
            {renderField ? renderField(field) : children}
          </FormControl>
          <FormMessage className="sm:col-span-2" />
        </FormItem>
      )}
    />
  );
};

export default FormFieldWrapper;
