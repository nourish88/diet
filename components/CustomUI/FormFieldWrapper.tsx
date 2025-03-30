import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { UseFormReturn, ControllerRenderProps } from "react-hook-form"

interface FormFieldWrapperProps {
    name: string
    label: React.ReactNode
    children?: React.ReactNode
    form?: UseFormReturn<any>  // Make form optional by adding ?
    renderField?: (field: ControllerRenderProps<any, any>) => React.ReactNode
    className?: string
}

const FormFieldWrapper = ({
    form,
    name,
    label,
    children,
    renderField,
    className = "mt-3 flex-col flex-2" // Keep the default className
}: FormFieldWrapperProps) => {
    // If no form is provided, just render a basic wrapper
    if (!form) {
        return (
            <div className="flex">
                <div className="mt-3 mr-2 flex-col">
                    <span className="font-bold text-xs">{label}</span>
                </div>
                <div className={className}>
                    {children}
                </div>
            </div>
        )
    }

    // If form is provided, use the full form field wrapper
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
