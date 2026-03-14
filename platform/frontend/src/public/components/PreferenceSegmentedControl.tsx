import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const rootClassName = className ? `public-segmented-control ${className}` : "public-segmented-control";

  useLayoutEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) {
      return;
    }

    const activeButton = container.querySelector<HTMLButtonElement>(`button[data-value="${String(value)}"]`);
    if (!activeButton) {
      indicator.style.opacity = "0";
      return;
    }

    indicator.style.opacity = "1";
    gsap.killTweensOf(indicator);
    gsap.to(indicator, {
      x: activeButton.offsetLeft,
      y: activeButton.offsetTop,
      width: activeButton.offsetWidth,
      height: activeButton.offsetHeight,
      duration: 0.46,
      ease: "expo.out",
      overwrite: true,
      force3D: true
    });
  }, [value, options.length, indicatorId]);

  return (
    <div ref={containerRef} className={rootClassName} role="group" aria-label={label}>
      <span ref={indicatorRef} className="public-segmented-control__indicator" aria-hidden="true" />
      {options.map((option) => {
        const isActive = option.value === value;
        const buttonClassName = [optionClassName, isActive ? "is-active" : undefined].filter(Boolean).join(" ");

        return (
          <button
            key={option.value}
            type="button"
            data-value={option.value}
            data-gsap-button
            className={buttonClassName || undefined}
            onClick={() => onChange(option.value)}
          >
            <span className="public-segmented-control__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}