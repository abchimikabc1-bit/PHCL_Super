"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TransactionFormProps {
  title: string;
  description: string;
  children: ReactNode;
  onBack?: () => void;
  className?: string;
}

export function TransactionFormCard({
  title,
  description,
  children,
  className,
}: TransactionFormProps) {
  return (
    <Card className={cn("border-2 border-border bg-card shadow-xl", className)}>
      <CardHeader className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b-2 border-border pb-6 space-y-2">
        <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
          {title}
        </CardTitle>
        <p className="text-sm sm:text-base text-muted-foreground">
          {description}
        </p>
      </CardHeader>
      <CardContent className="p-6 sm:p-8">
        {children}
      </CardContent>
    </Card>
  );
}

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-8 flex items-center justify-between px-2 fade-in">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          {/* Step Circle */}
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all",
              index < currentStep
                ? "bg-green-500 text-white"
                : index === currentStep
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/30 scale-110"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {index < currentStep ? "✓" : index + 1}
          </div>

          {/* Step Label */}
          <p
            className={cn(
              "text-xs sm:text-sm font-medium ml-2 transition-colors",
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {step}
          </p>

          {/* Connector */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-1 mx-2 rounded-full transition-colors",
                index < currentStep ? "bg-green-500" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  helperText?: string;
  animationDelay?: string;
}

export function FormField({
  label,
  error,
  children,
  helperText,
  animationDelay = "0ms",
}: FormFieldProps) {
  return (
    <div
      className="space-y-2 slide-in-left"
      style={{ animationDelay }}
    >
      <label className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm text-destructive font-medium animate-pulse">
          ⚠️ {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

interface ConfirmationCardProps {
  items: Array<{
    label: string;
    value: string | ReactNode;
    highlight?: boolean;
  }>;
  warning?: string;
}

export function ConfirmationCard({ items, warning }: ConfirmationCardProps) {
  return (
    <div className="space-y-4 modal-fade-in">
      <div className="bg-muted/60 rounded-lg p-6 space-y-3 border-2 border-border">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex justify-between items-center pb-3 last:pb-0",
              index !== items.length - 1 && "border-b border-border"
            )}
          >
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span
              className={cn(
                "font-bold",
                item.highlight
                  ? "text-lg text-primary"
                  : "text-foreground"
              )}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {warning && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 flex gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-amber-800">{warning}</p>
        </div>
      )}
    </div>
  );
}

interface SuccessScreenProps {
  title: string;
  message: string;
  subMessage?: string;
  icon?: ReactNode;
}

export function SuccessScreen({
  title,
  message,
  subMessage,
  icon,
}: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 modal-fade-in">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6 scale-in">
        {icon || <span className="text-5xl">✓</span>}
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 text-center">
        {title}
      </h2>
      <p className="text-muted-foreground text-center mb-2 max-w-md">
        {message}
      </p>
      {subMessage && (
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {subMessage}
        </p>
      )}
    </div>
  );
}
