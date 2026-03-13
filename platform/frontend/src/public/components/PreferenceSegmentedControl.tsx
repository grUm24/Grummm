import { motion } from "framer-motion";

interface SegmentedOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface PreferenceSegmentedControlProps<TValue extends string> {
  value: TValue;
  label: string;
  options: SegmentedOption<TValue>[];
  onChange: (value: TValue) => void;
  className?: string;
  optionClassName?: string;
  indicatorId?: string;
}

export function PreferenceSegmentedControl<TValue extends string>({
  value,
  label,
  options,
  onChange,
  className,
  optionClassName,
  indicatorId
}: PreferenceSegmentedControlProps<TValue>) {
  const rootClassName = className ? `public-segmented-control ${className}` : "public-segmented-control";
  const layoutId = indicatorId ?? `segmented-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={rootClassName} role="group" aria-label={label}>
      {options.map((option) => {
        const isActive = option.value === value;
        const buttonClassName = [optionClassName, isActive ? "is-active" : undefined].filter(Boolean).join(" ");

        return (
          <button
            key={option.value}
            type="button"
            className={buttonClassName || undefined}
            onClick={() => onChange(option.value)}
          >
            {isActive ? (
              // Shared layoutId lets the active capsule glide between options instead of flashing.
              <motion.span
                layoutId={layoutId}
                className="public-segmented-control__indicator"
                transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.8 }}
                aria-hidden="true"
              />
            ) : null}
            <span className="public-segmented-control__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}