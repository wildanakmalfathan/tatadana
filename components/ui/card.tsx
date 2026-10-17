import React from 'react'

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-[#0a0f16] rounded-2xl border border-emerald-900/30 shadow-card p-6 transition-all duration-200 hover:border-emerald-500/40 hover:shadow-premium ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-center justify-between pb-4 mb-4 border-b border-emerald-950/80 ${className}`} {...props}>
      {children}
    </div>
  )
}

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <h3 className={`text-base font-bold text-white tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  )
}
