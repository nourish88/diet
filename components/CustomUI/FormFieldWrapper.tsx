import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { UseFormReturn, ControllerRenderProps } from "react-hook-form"

interface FormFieldWrapperProps {
    form: UseFormReturn<any>
    name: string
    label: React.ReactNode
    children?: React.ReactNode
    renderField?: (field: ControllerRenderProps<any, any>) => React.ReactNode
    className?: string
}

const FormFieldWrapper = ({
                              form,
                              name,
                              label,
                              children,
                              renderField,
                              className = "mt-3 flex-col flex-2"
                          }: FormFieldWrapperProps) => {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({field}) => (
                <FormItem className="flex">
                    <FormLabel className="mt-3 mr-2 flex-col">
                        <span className="font-bold text-xs">{label}</span>
                    </FormLabel>
                    <FormControl className={className}>
                        {renderField ? renderField(field) : children}
                    </FormControl>
                    <FormMessage/>
                </FormItem>
            )}
        />
    )
}

export default FormFieldWrapper