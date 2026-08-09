"use client";

import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`bg-background rounded-lg shadow-lg shadow-black/5 hover:shadow-black/8 transition-shadow duration-300 ${className}`}>
      {children}
    </div>
  );
}
