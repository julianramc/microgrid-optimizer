"use client"

import { cn } from "@/lib/utils"
import { STEPS } from "@/lib/microgrid/store"
import type { WorkflowStep } from "@/lib/microgrid/types"

interface StepNavigationProps {
  currentStep: WorkflowStep
  onStepClick: (step: WorkflowStep) => void
  completedSteps: Set<WorkflowStep>
}

export function StepNavigation({ currentStep, onStepClick, completedSteps }: StepNavigationProps) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto px-2 py-3" aria-label="Workflow steps">
      {STEPS.map((step, idx) => {
        const isCurrent = step.key === currentStep
        const isCompleted = completedSteps.has(step.key)
        const isAccessible = isCompleted || isCurrent || idx === 0

        return (
          <div key={step.key} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  "mx-1 h-px w-6 shrink-0",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <button
              onClick={() => isAccessible && onStepClick(step.key)}
              disabled={!isAccessible}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
                isCurrent && "bg-primary text-primary-foreground",
                isCompleted && !isCurrent && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                !isCurrent && !isCompleted && "text-muted-foreground",
                isAccessible && !isCurrent && "cursor-pointer",
                !isAccessible && "cursor-not-allowed opacity-40"
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  isCurrent && "bg-primary-foreground text-primary",
                  isCompleted && !isCurrent && "bg-primary text-primary-foreground",
                  !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted && !isCurrent ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
