import React from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outlined" | "elevated";
}

const cardVariants = {
  default: "bg-white",
  outlined: "bg-white border border-secondary-200",
  elevated: "bg-white shadow-sm",
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = "default",
  ...props
}) => {
  return (
    <View
      className={`rounded-lg p-4 ${cardVariants[variant]} ${className || ""}`}
      {...props}
    >
      {children}
    </View>
  );
};

export default Card;

