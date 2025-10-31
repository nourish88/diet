import React from "react";
import { TouchableOpacity, Text, TouchableOpacityProps } from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const buttonVariants = {
  primary: "bg-primary-600",
  secondary: "bg-secondary-600",
  outline: "border border-primary-600 bg-transparent",
  ghost: "bg-transparent",
};

const buttonSizes = {
  sm: "px-3 py-2",
  md: "px-4 py-3",
  lg: "px-6 py-4",
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}) => {
  return (
    <TouchableOpacity
      className={`rounded-lg ${buttonVariants[variant]} ${buttonSizes[size]} ${
        className || ""
      }`}
      {...props}
    >
      <Text className="text-white text-center font-semibold">{children}</Text>
    </TouchableOpacity>
  );
};

export default Button;


